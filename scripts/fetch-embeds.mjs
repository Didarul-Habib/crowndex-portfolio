import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const worksPath = path.join(root, 'src/data/works.json');
const outputPath = path.join(root, 'src/data/embeds.generated.json');

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
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/\s+/g, ' ')
    .trim();
}

const works = JSON.parse(await readFile(worksPath, 'utf8'));
const results = {};

console.log('\nCrownDEX — Fetching official X post information\n');

for (const work of works) {
  try {
    const endpoint = new URL('https://publish.twitter.com/oembed');

    endpoint.searchParams.set('url', work.url);
    endpoint.searchParams.set('omit_script', 'true');
    endpoint.searchParams.set('dnt', 'true');

    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'CrownDEXPortfolio/1.0'
      },
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error(`X returned HTTP ${response.status}`);
    }

    const payload = await response.json();

    results[work.id] = {
      text: extractText(payload.html),
      authorName: payload.author_name ?? '',
      authorUrl: payload.author_url ?? '',
      fetched: true
    };

    console.log(`[OK] ${work.id}`);
  } catch (error) {
    results[work.id] = {
      text: '',
      authorName: '',
      authorUrl: '',
      fetched: false,
      error: error.message
    };

    console.log(`[FALLBACK] ${work.id}: ${error.message}`);
  }
}

await writeFile(
  outputPath,
  JSON.stringify(results, null, 2) + '\n',
  'utf8'
);

console.log('\nX embed metadata generated successfully.');
console.log('The website can build even if individual X requests fail.\n');