import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectsPath = path.join(root, 'src/data/projects.json');
const embedsPath = path.join(root, 'src/data/embeds.generated.json');
const livePath = path.join(root, 'src/data/x-live.generated.json');

function extractText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(file, fallback = {}) {
  return readFile(file, 'utf8')
    .then(text => JSON.parse(text))
    .catch(() => fallback);
}

function finiteMetric(value, previous) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : (typeof previous === 'number' && Number.isFinite(previous) ? previous : null);
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function pickMp4(video) {
  if (!video || typeof video !== 'object') return '';
  const formats = Array.isArray(video.formats) ? video.formats : [];
  const mp4 = formats.filter(item =>
    item && typeof item.url === 'string' &&
    (String(item.container || '').toLowerCase() === 'mp4' || item.url.toLowerCase().includes('.mp4'))
  );
  const lowerBandwidth = mp4.filter(item => !Number(item.width) || Number(item.width) <= 960);
  const candidates = lowerBandwidth.length ? lowerBandwidth : mp4;
  candidates.sort((a, b) => {
    const aBitrate = Number.isFinite(Number(a.bitrate)) ? Number(a.bitrate) : Number.MAX_SAFE_INTEGER;
    const bBitrate = Number.isFinite(Number(b.bitrate)) ? Number(b.bitrate) : Number.MAX_SAFE_INTEGER;
    return aBitrate - bBitrate;
  });
  if (candidates[0]?.url) return candidates[0].url;
  if (typeof video.url === 'string' && video.url.toLowerCase().includes('.mp4')) return video.url;
  if (typeof video.transcode_url === 'string' && video.transcode_url.toLowerCase().includes('.mp4')) return video.transcode_url;
  return '';
}

async function fetchOfficialEmbed(project, previous) {
  const url = project.xUrl || project.url;
  if (!project.id || !url) return previous[project.id] || null;
  try {
    const endpoint = new URL('https://publish.twitter.com/oembed');
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('omit_script', 'true');
    endpoint.searchParams.set('dnt', 'true');
    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'CrownDEXPortfolio/3.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`X oEmbed returned HTTP ${response.status}`);
    const payload = await response.json();
    return {
      text: extractText(payload.html),
      authorName: payload.author_name ?? '',
      authorUrl: payload.author_url ?? '',
      fetched: true
    };
  } catch (error) {
    return {
      ...(previous[project.id] || {}),
      text: previous[project.id]?.text || '',
      authorName: previous[project.id]?.authorName || '',
      authorUrl: previous[project.id]?.authorUrl || '',
      fetched: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Best-effort public post snapshot from FxTwitter/FxEmbed.
 * This is an unofficial community endpoint, not the official X API.
 * Keep the last successful values if the endpoint is unavailable.
 */
async function fetchPublicPostSnapshot(project, previous) {
  const url = project.xUrl || project.url;
  const id = /\/status\/(\d+)/.exec(url || '')?.[1];
  if (!id) return previous[project.id] || null;

  try {
    const response = await fetch(`https://api.fxtwitter.com/i/status/${id}`, {
      headers: {
        'User-Agent': 'CrownDEXPortfolio/3.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error(`FxTwitter returned HTTP ${response.status}`);
    const payload = await response.json();
    const tweet = payload?.tweet || payload?.status;
    if (!tweet || tweet.type === 'tombstone') throw new Error('Post data unavailable');

    const media = tweet.media && typeof tweet.media === 'object' ? tweet.media : {};
    const videos = Array.isArray(media.videos) ? media.videos : [];
    const allMedia = Array.isArray(media.all) ? media.all : [];
    const video = videos[0] || allMedia.find(item => item?.type === 'video' || item?.type === 'gif') || null;
    const photos = Array.isArray(media.photos) ? media.photos : [];
    const previewVideo = pickMp4(video);
    const thumbnail = video?.thumbnail_url || photos[0]?.url || previous[project.id]?.thumbnail || '';
    const duration = formatDuration(video?.duration) || previous[project.id]?.duration || '';

    const result = {
      views: finiteMetric(tweet.views, previous[project.id]?.views),
      likes: finiteMetric(tweet.likes, previous[project.id]?.likes),
      comments: finiteMetric(tweet.replies, previous[project.id]?.comments),
      reposts: finiteMetric(tweet.reposts, previous[project.id]?.reposts),
      bookmarks: finiteMetric(tweet.bookmarks, previous[project.id]?.bookmarks),
      thumbnail,
      previewVideo: previewVideo || previous[project.id]?.previewVideo || '',
      videoUrl: previewVideo || previous[project.id]?.videoUrl || previous[project.id]?.previewVideo || '',
      duration,
      fetchedAt: new Date().toISOString(),
      source: 'FxTwitter public post snapshot (unofficial)'
    };

    const hasUsefulData = Object.values(result).some(value =>
      typeof value === 'number' || (typeof value === 'string' && value.length > 0)
    );
    if (!hasUsefulData) throw new Error('No public metrics or media were returned');

    const mediaLabel = result.previewVideo ? 'video' : result.thumbnail ? 'poster' : 'no media';
    console.log(`[X DATA] ${project.id}: views=${result.views ?? 'n/a'}, likes=${result.likes ?? 'n/a'}, replies=${result.comments ?? 'n/a'}, ${mediaLabel}`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (previous[project.id]) {
      console.log(`[X DATA CACHE] ${project.id}: keeping last successful snapshot (${message})`);
      return previous[project.id];
    }
    console.log(`[X DATA SKIP] ${project.id}: ${message}`);
    return null;
  }
}

const config = JSON.parse(await readFile(projectsPath, 'utf8'));
const projects = Array.isArray(config) ? config : config.projects;
if (!Array.isArray(projects)) throw new Error('projects.json must contain a projects array.');

const previousEmbeds = await readJson(embedsPath, {});
const previousLive = await readJson(livePath, {});
const nextEmbeds = { ...previousEmbeds };
const nextLive = { ...previousLive };

console.log('\nCrownDEX — refreshing X post text and public media snapshots\n');

const embedUpdates = await Promise.all(projects.map(async project => [
  project.id,
  await fetchOfficialEmbed(project, previousEmbeds)
]));
for (const [id, result] of embedUpdates) {
  if (result) nextEmbeds[id] = result;
  console.log(`${result?.fetched ? '[OK]' : '[EMBED CACHE]'} ${id}`);
}

console.log('\nCrownDEX — refreshing public engagement and video metadata\n');

const liveUpdates = await Promise.all(projects.map(async project => [
  project.id,
  await fetchPublicPostSnapshot(project, previousLive)
]));
for (const [id, result] of liveUpdates) {
  if (result) nextLive[id] = result;
}

await writeFile(embedsPath, `${JSON.stringify(nextEmbeds, null, 2)}\n`, 'utf8');
await writeFile(livePath, `${JSON.stringify(nextLive, null, 2)}\n`, 'utf8');

console.log('\nX post text and cached public metrics/media snapshots generated.');
console.log('If the unofficial metrics endpoint is unavailable, the last successful snapshot is retained.');
console.log('The portfolio still builds when X/FxTwitter is unavailable.\n');
