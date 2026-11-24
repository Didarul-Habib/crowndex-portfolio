import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, Clapperboard, Eye, EyeOff, Film, FolderUp, Image as ImageIcon, LayoutDashboard, LoaderCircle, LockKeyhole, LogOut, Menu, Pencil, Plus, Save, Settings2, ShieldCheck, Sparkles, Trash2, Users, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { backend, type CreatorProgram, type SiteSettings, validHttps, validXUrl } from './lib/content';
import type { Work } from './CrownDEXV4';
import './admin.css';

type Page = 'overview' | 'videos' | 'programs' | 'identity';
type AuthStage = 'loading' | 'signed-out' | 'not-authorized' | 'authorized';
type Source = 'x' | 'uploaded';
type VideoForm = { id: string; title: string; category: string; url: string; video_url: string; thumbnail: string; featured: boolean; published: boolean; source: Source };
type ProgramForm = { id: string; name: string; role: string; description: string; url: string; logo_url: string; published: boolean };
const emptyVideo = (): VideoForm => ({ id: '', title: '', category: 'AI Creations', url: '', video_url: '', thumbnail: '', featured: false, published: true, source: 'x' });
const emptyProgram = (): ProgramForm => ({ id: '', name: '', role: 'CREATOR', description: '', url: '', logo_url: '', published: true });
const initialSettings: SiteSettings = { id: 1, about_intro: '', about_secondary: '', x_profile: 'https://x.com/_CrownDEX', telegram_url: 'https://t.me/didarul_habib96' };

const sidebar = [
  { key: 'overview' as Page, title: 'Overview', icon: LayoutDashboard },
  { key: 'videos' as Page, title: 'Portfolio & videos', icon: Clapperboard },
  { key: 'programs' as Page, title: 'Creator programs', icon: Users },
  { key: 'identity' as Page, title: 'Profile & links', icon: Settings2 }
];

function StudioMark() { return <span className="admin-brand"><span className="admin-mark">C<span>D</span>X</span><span><strong>CROWNDEX</strong><small>CONTENT STUDIO</small></span></span>; }

export default function AdminStudio() {
  const [stage, setStage] = useState<AuthStage>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState<Page>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [programs, setPrograms] = useState<CreatorProgram[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [videoForm, setVideoForm] = useState<VideoForm>(emptyVideo);
  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgram);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [uploading, setUploading] = useState<'video' | 'thumbnail' | 'logo' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!backend) return;
    const [v, p, s] = await Promise.all([
      backend.from('portfolio_works').select('*').order('sort_order'),
      backend.from('creator_programs').select('*').order('sort_order'),
      backend.from('site_settings').select('*').eq('id', 1).maybeSingle()
    ]);
    if (v.error || p.error || s.error) {
      setNotice(`Unable to load studio data. ${v.error?.message || p.error?.message || s.error?.message}`);
      return;
    }
    setWorks((v.data || []) as Work[]);
    setPrograms((p.data || []) as CreatorProgram[]);
    if (s.data) setSettings(s.data as SiteSettings);
  }, []);

  useEffect(() => {
    if (!backend) { setStage('signed-out'); return; }
    let active = true;
    async function verify() {
      if (!backend) return;
      const { data, error } = await backend.auth.getUser();
      if (!active) return;
      if (error || !data.user) { setStage('signed-out'); setUser(null); return; }
      const { data: adminRow, error: adminError } = await backend.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (!active) return;
      setUser(data.user);
      setStage(!adminError && adminRow ? 'authorized' : 'not-authorized');
      if (!adminError && adminRow) void load();
    }
    void verify();
    const { data: subscription } = backend.auth.onAuthStateChange(() => { window.setTimeout(() => { if (active) void verify(); }, 0); });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [load]);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!backend) return;
    setBusy(true); setNotice('');
    const { error } = await backend.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setNotice(error.message);
  }
  async function logOut() {
    if (!backend) return;
    await backend.auth.signOut();
    setStage('signed-out'); setUser(null); setPassword('');
  }

  async function uploadFile(e: ChangeEvent<HTMLInputElement>, dest: 'video' | 'thumbnail' | 'logo') {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!backend || !file) return;
    const isVideo = dest === 'video';
    const accepted = isVideo ? ['video/mp4','video/webm'] : ['image/jpeg','image/png','image/webp','image/avif'];
    const limit = isVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!accepted.includes(file.type) || file.size > limit) {
      setNotice(`Choose ${isVideo ? 'MP4 or WebM video under 50 MB' : 'JPG, PNG, WebP or AVIF image under 8 MB'}.`);
      return;
    }
    setUploading(dest); setNotice('');
    const suffix = ({'video/mp4':'mp4','video/webm':'webm','image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'} as Record<string,string>)[file.type];
    const path = `${dest === 'logo' ? 'programs' : 'works'}/${crypto.randomUUID()}.${suffix}`;
    const { error } = await backend.storage.from('portfolio-media').upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false });
    if (error) { setNotice(`Upload failed: ${error.message}`); setUploading(null); return; }
    const publicUrl = backend.storage.from('portfolio-media').getPublicUrl(path).data.publicUrl;
    if (dest === 'video') setVideoForm(v => ({ ...v, video_url: publicUrl, source: 'uploaded' }));
    if (dest === 'thumbnail') setVideoForm(v => ({ ...v, thumbnail: publicUrl }));
    if (dest === 'logo') setProgramForm(v => ({ ...v, logo_url: publicUrl }));
    setNotice('File uploaded securely. Save the record to publish the change.');
    setUploading(null);
  }

  function beginVideo(item?: Work) {
    setVideoForm(item ? {
      id: item.id, title: item.title || '', category: item.category, url: item.url || '', video_url: item.video_url || '', thumbnail: item.thumbnail || '',
      featured: Boolean(item.featured), published: item.published !== false, source: item.video_url ? 'uploaded' : 'x'
    } : emptyVideo());
    setShowVideoForm(true); setNotice(''); setPage('videos');
  }

  async function saveVideo(e: FormEvent) {
    e.preventDefault();
    if (!backend) return;
    const title = videoForm.title.trim();
    const category = videoForm.category.trim();
    if (!title || !category) { setNotice('Title and category are required.'); return; }
    if (videoForm.source === 'x' && !validXUrl(videoForm.url)) { setNotice('Paste a full https://x.com/handle/status/123456789 X post URL.'); return; }
    if (videoForm.source === 'uploaded' && !validHttps(videoForm.video_url)) { setNotice('Upload an MP4/WebM video before saving.'); return; }
    if (videoForm.source === 'uploaded' && videoForm.url.trim() && !validXUrl(videoForm.url)) { setNotice('The optional X post link must be a full https://x.com/handle/status/123456789 URL.'); return; }
    if (videoForm.thumbnail && !validHttps(videoForm.thumbnail) && !videoForm.thumbnail.startsWith('/assets/')) { setNotice('Cover image must be uploaded or use a local /assets/ image path.'); return; }
    setBusy(true); setNotice('');
    const record = {
      id: videoForm.id || `cdx-${crypto.randomUUID()}`,
      title, category, url: videoForm.url.trim(), video_url: videoForm.source === 'uploaded' ? videoForm.video_url : '',
      thumbnail: videoForm.thumbnail, featured: videoForm.featured, published: videoForm.published,
      sort_order: videoForm.id ? (works.find(w => w.id === videoForm.id)?.sort_order ?? works.length) : works.length
    };
    const { error } = await backend.from('portfolio_works').upsert(record, { onConflict: 'id' });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    setShowVideoForm(false); setVideoForm(emptyVideo()); setNotice('Video project saved successfully.'); await load();
  }

  async function deleteVideo(work: Work) {
    if (!backend || !window.confirm(`Delete "${work.title || work.id}" from your portfolio? Uploaded files will remain in Storage.`)) return;
    setBusy(true);
    const { error } = await backend.from('portfolio_works').delete().eq('id', work.id);
    setBusy(false); setNotice(error ? error.message : 'Project deleted.'); if (!error) await load();
  }
  async function toggleVideo(work: Work) {
    if (!backend) return;
    const { error } = await backend.from('portfolio_works').update({ published: work.published === false }).eq('id', work.id);
    setNotice(error ? error.message : 'Visibility updated.'); if (!error) await load();
  }
  async function reorder(table: 'portfolio_works' | 'creator_programs', rows: Array<{id:string; sort_order:number}>, at: number, direction: -1 | 1) {
    if (!backend) return;
    const other = at + direction;
    if (other < 0 || other >= rows.length) return;
    // Normalize positions to handle legacy/unordered data safely.
    setBusy(true);
    const ordered = [...rows];
    [ordered[at], ordered[other]] = [ordered[other], ordered[at]];
    for (let i = 0; i < ordered.length; i++) {
      const { error } = await backend.from(table).update({ sort_order: i }).eq('id', ordered[i].id);
      if (error) { setNotice(error.message); break; }
    }
    setBusy(false); await load();
  }
  function beginProgram(item?: CreatorProgram) {
    setProgramForm(item ? { id:item.id, name:item.name, role:item.role, description:item.description, url:item.url, logo_url:item.logo_url, published:item.published !== false } : emptyProgram());
    setShowProgramForm(true); setNotice(''); setPage('programs');
  }
  async function saveProgram(e: FormEvent) {
    e.preventDefault(); if (!backend) return;
    if (!programForm.name.trim()) { setNotice('Creator program name is required.'); return; }
    if (programForm.url && !validHttps(programForm.url)) { setNotice('Program website must be an HTTPS URL.'); return; }
    setBusy(true); setNotice('');
    const record = { id: programForm.id || crypto.randomUUID(), name:programForm.name.trim(), role:programForm.role.trim(), description:programForm.description.trim(), url:programForm.url.trim(), logo_url:programForm.logo_url, published:programForm.published, sort_order:programForm.id ? (programs.find(p => p.id === programForm.id)?.sort_order ?? programs.length) : programs.length };
    const { error } = await backend.from('creator_programs').upsert(record, { onConflict: 'id' });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    setShowProgramForm(false); setProgramForm(emptyProgram()); setNotice('Creator program saved.'); await load();
  }
  async function deleteProgram(program: CreatorProgram) {
    if (!backend || !window.confirm(`Remove "${program.name}" from your site?`)) return;
    setBusy(true);
    const { error } = await backend.from('creator_programs').delete().eq('id', program.id);
    setBusy(false); setNotice(error ? error.message : 'Program removed.'); if (!error) await load();
  }
  async function toggleProgram(program: CreatorProgram) {
    if (!backend) return;
    const { error } = await backend.from('creator_programs').update({ published: !program.published }).eq('id', program.id);
    setNotice(error ? error.message : 'Visibility updated.'); if (!error) await load();
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault(); if (!backend) return;
    if (!validXUrl(settings.x_profile + '/status/123456789')) { // validates handle and HTTPS without accepting arbitrary domains
      setNotice('Enter your full X profile URL, for example https://x.com/_CrownDEX.'); return;
    }
    if (settings.telegram_url && !validHttps(settings.telegram_url)) { setNotice('Telegram link must use HTTPS.'); return; }
    setBusy(true);
    const { error } = await backend.from('site_settings').upsert(settings, { onConflict: 'id' });
    setBusy(false); setNotice(error ? error.message : 'Profile updated. Changes will appear on the public site.');
    if (!error) await load();
  }

  if (!backend) return <div className="admin-login-shell"><div className="admin-login-panel"><StudioMark/><div className="admin-lock-icon"><Settings2 size={31}/></div><h1>Studio not connected.</h1><p>Your local portfolio still works. To activate the real admin panel, connect your Supabase project using the included <code>setup-admin.ps1</code> and run <code>supabase/schema.sql</code> in its SQL editor.</p><a className="admin-primary-link" href="/">← Back to portfolio</a></div></div>;
  if (stage === 'loading') return <div className="admin-login-shell"><div className="admin-loading"><LoaderCircle className="admin-spinner" size={28}/> Verifying studio access…</div></div>;
  if (stage === 'signed-out') return <div className="admin-login-shell"><form className="admin-login-panel" onSubmit={signIn}><StudioMark/><div className="admin-lock-icon"><LockKeyhole size={30}/></div><span className="admin-eyebrow">PRIVATE / CONTENT MANAGEMENT</span><h1>Welcome back.</h1><p>Secure entry to the CrownDEX content studio. Only approved administrators can edit the public site.</p><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" placeholder="you@example.com"/><label htmlFor="admin-password">Password</label><div className="admin-password-row"><input id="admin-password" type={showPassword ? 'text':'password'} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••"/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password':'Show password'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>{notice && <p role="alert" className="admin-error">{notice}</p>}<button className="admin-action" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Enter the studio'} <ArrowRight size={18}/></button><a className="admin-back" href="/"><ArrowLeft size={15}/> Back to portfolio</a></form></div>;
  if (stage === 'not-authorized') return <div className="admin-login-shell"><div className="admin-login-panel"><StudioMark/><ShieldCheck size={37}/><h1>Access restricted.</h1><p>This account is signed in, but it is not on the approved CrownDEX administrator list.</p><button className="admin-action" onClick={logOut}>Sign out <LogOut size={17}/></button></div></div>;

  const published = works.filter(w => w.published !== false).length;
  const livePrograms = programs.filter(p => p.published !== false).length;
  const currentTab = sidebar.find(t => t.key === page)?.title || 'Overview';
  return <div className="admin-shell">
    <aside className={`admin-sidebar ${mobileNav ? 'admin-sidebar-open':''}`} aria-label="Studio navigation"><div className="admin-sidebar-top"><StudioMark/><button className="admin-sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close sidebar"><X/></button></div><div className="admin-side-label">WORKSPACE</div><nav>{sidebar.map(item => <button key={item.key} className={`admin-navitem ${page === item.key ? 'admin-nav-active':''}`} onClick={() => { setPage(item.key); setMobileNav(false); setNotice(''); setShowVideoForm(false); setShowProgramForm(false); }}><item.icon size={19}/>{item.title}<ArrowUpRight className="admin-nav-arrow" size={15}/></button>)}</nav><div className="admin-sidebar-foot"><div><span className="admin-online-dot"/> SUPABASE CONNECTED</div><a href="/" target="_blank" rel="noopener noreferrer"><Eye size={17}/> View live portfolio <ArrowUpRight size={15}/></a><button onClick={logOut}><LogOut size={17}/> Sign out</button></div></aside>
    {mobileNav && <button aria-label="Close navigation" className="admin-backdrop" onClick={() => setMobileNav(false)}/>}
    <div className="admin-main"><header className="admin-topbar"><div className="admin-top-left"><button className="admin-mobile-toggle" aria-label="Open studio navigation" onClick={() => setMobileNav(true)}><Menu size={23}/></button><span className="admin-breadcrumb">STUDIO <span>/</span> {currentTab.toUpperCase()}</span></div><div className="admin-top-right"><span className="admin-user">{user?.email}</span><a href="/" target="_blank" rel="noopener noreferrer">Live site <ArrowUpRight size={16}/></a></div></header>
    <main className="admin-content"><div className="admin-heading"><div><span className="admin-eyebrow">CROWNDEX / CONTROL ROOM</span><h1>{page === 'overview' ? 'Your creative universe.' : currentTab}</h1><p>{page === 'overview' ? 'Manage the projects, programs and story behind your portfolio.' : page === 'videos' ? 'Upload your films for muted in-page previews, link the original X post, and arrange your projects.' : page === 'programs' ? 'Keep your creator collaborations and program memberships current.' : 'Update the introduction and contact destinations shown on your public website.'}</p></div>{page === 'videos' && !showVideoForm && <button className="admin-action admin-heading-action" onClick={() => beginVideo()}><Plus size={18}/> Add project</button>}{page === 'programs' && !showProgramForm && <button className="admin-action admin-heading-action" onClick={() => beginProgram()}><Plus size={18}/> Add program</button>}</div>
    {notice && <div className="admin-notice" role="status"><Sparkles size={16}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={17}/></button></div>}

    {page === 'overview' && <><section className="admin-stat-grid"><div className="admin-stat"><span><Film size={20}/> PORTFOLIO</span><strong>{works.length.toString().padStart(2,'0')}</strong><small>{published} published / {works.length-published} drafts</small></div><div className="admin-stat"><span><Users size={20}/> CREATOR PROGRAMS</span><strong>{programs.length.toString().padStart(2,'0')}</strong><small>{livePrograms} visible on the public site</small></div><div className="admin-stat"><span><ShieldCheck size={20}/> ACCESS</span><strong className="admin-stat-word">PRIVATE</strong><small>Protected by Supabase authentication + RLS</small></div></section><section className="admin-overview-grid"><article className="admin-panel"><span className="admin-eyebrow">QUICK ACTIONS</span><h2>Keep the momentum.</h2><div className="admin-quick-actions"><button onClick={() => beginVideo()}><Clapperboard size={22}/><span><strong>Publish a new film</strong><small>X post plus an MP4 / WebM preview</small></span><ArrowUpRight size={19}/></button><button onClick={() => beginProgram()}><Users size={22}/><span><strong>Add a creator program</strong><small>Name, role, badge and website link</small></span><ArrowUpRight size={19}/></button><button onClick={() => setPage('identity')}><Settings2 size={22}/><span><strong>Refresh your story</strong><small>Creator bio and contact links</small></span><ArrowUpRight size={19}/></button></div></article><article className="admin-panel admin-overview-note"><span className="admin-eyebrow">PUBLISHING STATUS</span><div className="admin-orbit-icon"><Sparkles size={42}/></div><h2>Changes appear live.</h2><p>New projects and program edits are saved to your secure database. Your published portfolio fetches them without a Git commit or Netlify rebuild.</p><p className="admin-muted">Only published items are visible to visitors. Keep drafts private while you refine them.</p></article></section></>}

    {page === 'videos' && <>
    {showVideoForm ? <form className="admin-panel admin-editor" onSubmit={saveVideo}><div className="admin-form-head"><div><span className="admin-eyebrow">PROJECT EDITOR</span><h2>{videoForm.id ? 'Edit project' : 'New cinematic project'}</h2></div><button className="admin-icon-button" type="button" onClick={() => setShowVideoForm(false)} aria-label="Close editor"><X/></button></div>
      <div className="admin-form-grid"><div className="admin-fields"><label>Project title<input required maxLength={160} value={videoForm.title} onChange={e => setVideoForm(v=>({...v,title:e.target.value}))} placeholder="A cinematic world in 30 seconds"/></label><label>Category<input required maxLength={55} list="video-categories" value={videoForm.category} onChange={e => setVideoForm(v=>({...v,category:e.target.value}))} placeholder="Short Films"/><datalist id="video-categories"><option value="Short Films"/><option value="Product Ads"/><option value="AI Creations"/><option value="Visual Experiments"/></datalist></label><span className="admin-field-label">Video source</span><div className="admin-source-tabs"><button className={videoForm.source==='x' ? 'selected':''} type="button" onClick={() => setVideoForm(v=>({...v,source:'x'}))}>X post URL</button><button className={videoForm.source==='uploaded' ? 'selected':''} type="button" onClick={() => setVideoForm(v=>({...v,source:'uploaded'}))}>Upload video</button></div>{videoForm.source === 'x' ? <label>Full X post URL<input type="url" required value={videoForm.url} onChange={e => setVideoForm(v=>({...v,url:e.target.value}))} placeholder="https://x.com/_CrownDEX/status/..."/><small>The official X player will be used on the public site.</small></label> : <><div className="admin-upload-box"><FolderUp size={23}/><strong>MP4 or WebM upload</strong><small>Maximum 50 MB. Muted previews play automatically as visitors scroll to the film.</small><input type="file" accept="video/mp4,video/webm" onChange={e => void uploadFile(e,'video')} disabled={Boolean(uploading)}/></div>{videoForm.video_url && <p className="admin-file-ready"><Check size={15}/> Video ready to publish</p>}<label>Original X post URL (optional)<input type="url" value={videoForm.url} onChange={e => setVideoForm(v=>({...v,url:e.target.value}))} placeholder="https://x.com/_CrownDEX/status/..."/><small>Keep the original post linked beside your uploaded film.</small></label></>}<label>Optional project cover image<div className="admin-upload-box admin-upload-small"><ImageIcon size={21}/><span>Choose JPG, PNG, WebP or AVIF · up to 8 MB</span><input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => void uploadFile(e,'thumbnail')} disabled={Boolean(uploading)}/></div></label><div className="admin-check-row"><label><input type="checkbox" checked={videoForm.featured} onChange={e => setVideoForm(v=>({...v,featured:e.target.checked}))}/> Featured on homepage</label><label><input type="checkbox" checked={videoForm.published} onChange={e => setVideoForm(v=>({...v,published:e.target.checked}))}/> Publish immediately</label></div></div><div className="admin-preview"><span className="admin-eyebrow">LIVE COVER PREVIEW</span><div className="admin-preview-art" style={videoForm.thumbnail ? {backgroundImage:`url("${videoForm.thumbnail}")`} : undefined}>{!videoForm.thumbnail && <><span>CDX / 2026</span><strong>{videoForm.title || 'YOUR NEXT FILM'}</strong><small>THE NEXT CHAPTER</small></>}</div><p>Your cover becomes the project poster across desktop, tablet and mobile. Without a cover, a typographic fallback is used.</p></div></div><div className="admin-form-actions"><button type="button" className="admin-outline" onClick={() => setShowVideoForm(false)}>Cancel</button><button className="admin-action" disabled={busy || Boolean(uploading)} type="submit">{busy ? <LoaderCircle className="admin-spinner" size={16}/> : <Save size={17}/>} Save project</button></div>
    </form> : <div className="admin-panel"><div className="admin-list-head"><span>{works.length} PROJECT{works.length === 1 ? '' : 'S'}</span><small>Use arrows to change display order. Drafts remain private.</small></div>{works.length === 0 && <div className="admin-empty">No projects yet. Add your first film using the button above.</div>}{works.map((work,i) => <div className="admin-list-row" key={work.id}><div className="admin-thumb">{work.thumbnail ? <img src={work.thumbnail} alt=""/> : <Film size={20}/>}</div><div className="admin-list-copy"><strong>{work.title || `AI Project ${i+1}`}</strong><span>{work.category} · {work.video_url ? 'Uploaded video' : 'X video'} {work.featured && ' · Featured'}</span></div><span className={`admin-status ${work.published===false ? 'admin-status-draft' : ''}`}>{work.published===false ? 'DRAFT':'LIVE'}</span><div className="admin-row-actions"><button disabled={busy || i===0} title="Move up" aria-label={`Move ${work.title} up`} onClick={() => void reorder('portfolio_works', works.map((w,j)=>({id:w.id,sort_order:w.sort_order??j})),i,-1)}><ArrowUp size={17}/></button><button disabled={busy || i===works.length-1} title="Move down" aria-label={`Move ${work.title} down`} onClick={() => void reorder('portfolio_works',works.map((w,j)=>({id:w.id,sort_order:w.sort_order??j})),i,1)}><ArrowDown size={17}/></button><button title="Edit" aria-label={`Edit ${work.title}`} onClick={() => beginVideo(work)}><Pencil size={17}/></button><button title={work.published === false ? 'Publish' : 'Unpublish'} aria-label={`Change ${work.title} visibility`} onClick={() => void toggleVideo(work)}>{work.published===false ? <Eye size={17}/> : <EyeOff size={17}/>}</button><button className="admin-delete" title="Delete" aria-label={`Delete ${work.title}`} onClick={() => void deleteVideo(work)}><Trash2 size={17}/></button></div></div>)}</div>}
    </>}

    {page === 'programs' && <>
    {showProgramForm ? <form className="admin-panel admin-editor" onSubmit={saveProgram}><div className="admin-form-head"><div><span className="admin-eyebrow">CREATOR PROGRAM EDITOR</span><h2>{programForm.id ? 'Edit membership' : 'New creator program'}</h2></div><button className="admin-icon-button" type="button" onClick={() => setShowProgramForm(false)} aria-label="Close editor"><X/></button></div><div className="admin-form-grid"><div className="admin-fields"><label>Program or brand name<input required maxLength={130} value={programForm.name} onChange={e => setProgramForm(p=>({...p,name:e.target.value}))} placeholder="Enter your real creator program"/></label><label>Your role / membership name<input maxLength={110} value={programForm.role} onChange={e => setProgramForm(p=>({...p,role:e.target.value}))} placeholder="Creator Ambassador"/></label><label>Short description<textarea rows={4} maxLength={500} value={programForm.description} onChange={e => setProgramForm(p=>({...p,description:e.target.value}))} placeholder="Describe your actual involvement…"/></label><label>Optional official website<input type="url" value={programForm.url} onChange={e => setProgramForm(p=>({...p,url:e.target.value}))} placeholder="https://..."/></label><label>Optional program logo<div className="admin-upload-box admin-upload-small"><ImageIcon size={20}/><span>Upload approved logo / badge image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>void uploadFile(e,'logo')} disabled={Boolean(uploading)}/></div></label><label className="admin-single-check"><input type="checkbox" checked={programForm.published} onChange={e => setProgramForm(p=>({...p,published:e.target.checked}))}/> Display on the website</label></div><div className="admin-preview admin-program-preview"><span className="admin-eyebrow">PREVIEW</span><div className="admin-preview-program">{programForm.logo_url ? <img src={programForm.logo_url} alt=""/> : <Sparkles size={28}/>}<div><small>{programForm.role || 'CREATOR PROGRAM'}</small><strong>{programForm.name || 'Your program name'}</strong><p>{programForm.description || 'Describe your genuine partnership or membership.'}</p></div></div><p>Only add genuine memberships and programs. You can always unpublish or remove them.</p></div></div><div className="admin-form-actions"><button type="button" className="admin-outline" onClick={() => setShowProgramForm(false)}>Cancel</button><button className="admin-action" disabled={busy || Boolean(uploading)} type="submit"><Save size={17}/> Save program</button></div></form> : <div className="admin-panel"><div className="admin-list-head"><span>{programs.length} PROGRAM{programs.length === 1 ? '' : 'S'}</span><small>Add only verified memberships; unpublished records stay hidden.</small></div>{programs.length===0 && <div className="admin-empty">No creator programs listed yet. Add your first confirmed program using the button above.</div>}{programs.map((p,i) => <div className="admin-list-row" key={p.id}><div className="admin-thumb">{p.logo_url ? <img src={p.logo_url} alt=""/> : <Users size={20}/>}</div><div className="admin-list-copy"><strong>{p.name}</strong><span>{p.role || 'Creator program'}</span></div><span className={`admin-status ${!p.published ? 'admin-status-draft':''}`}>{p.published?'LIVE':'HIDDEN'}</span><div className="admin-row-actions"><button disabled={busy || i===0} aria-label={`Move ${p.name} up`} onClick={()=>void reorder('creator_programs',programs,i,-1)}><ArrowUp size={17}/></button><button disabled={busy || i===programs.length-1} aria-label={`Move ${p.name} down`} onClick={()=>void reorder('creator_programs',programs,i,1)}><ArrowDown size={17}/></button><button aria-label={`Edit ${p.name}`} onClick={()=>beginProgram(p)}><Pencil size={17}/></button><button aria-label={`Change visibility of ${p.name}`} onClick={()=>void toggleProgram(p)}>{p.published ? <EyeOff size={17}/> : <Eye size={17}/>}</button><button className="admin-delete" aria-label={`Remove ${p.name}`} onClick={()=>void deleteProgram(p)}><Trash2 size={17}/></button></div></div>)}</div>}
    </>}

    {page === 'identity' && <form className="admin-panel admin-editor admin-identity" onSubmit={saveSettings}><div className="admin-form-head"><div><span className="admin-eyebrow">YOUR CREATIVE STORY</span><h2>Profile & contact.</h2></div><Sparkles size={24}/></div><div className="admin-identity-layout"><div className="admin-fields"><label>About introduction<textarea rows={5} maxLength={1200} value={settings.about_intro} onChange={e => setSettings(s=>({...s,about_intro:e.target.value}))} placeholder="I’m CrownDEX — an independent AI video creator…"/></label><label>Creative approach / second paragraph<textarea rows={5} maxLength={1200} value={settings.about_secondary} onChange={e => setSettings(s=>({...s,about_secondary:e.target.value}))} placeholder="My approach is simple…"/></label><label>X profile<input type="url" required value={settings.x_profile} onChange={e => setSettings(s=>({...s,x_profile:e.target.value}))}/></label><label>Telegram contact<input type="url" value={settings.telegram_url} onChange={e => setSettings(s=>({...s,telegram_url:e.target.value}))}/></label></div><aside className="admin-identity-preview"><div className="admin-preview-art"><strong>CDX</strong><span>THE CREATIVE IDENTITY</span></div><p>Your words define the About section. The portfolio uses your original CrownDEX brand design, not someone else's profile.</p><p>Changes to X and Telegram links update the public header, creator section and footer.</p></aside></div><div className="admin-form-actions"><button className="admin-action" type="submit" disabled={busy}><Save size={17}/> Save profile changes</button></div></form>}
    </main></div>
  </div>;
}
