# CrownDEX — Editorial Text & Motion Polish (November 2026)

## What changed

- Hero headline: **CrownDEX · Stories in Motion · Visuals That Stay**
- Removes duplicate creative-role descriptors in the hero.
- About copy: first-person, specific and professional; preserves existing V4 layout.
- Motion: per-character staged entrance, gentle responsive letter hover, animated gradient accents, section heading gleams, and activated existing scroll-reveal choreography.
- Responsive adjustments for smaller phones; honors `prefers-reduced-motion`.
- No changes to admin authentication, video upload logic, five X links, creator-program editor, or existing Supabase connection.

## Installation

Save the PowerShell installer to `I:\CrownDEX_Editorial_Polish_2026.ps1` and run:

```powershell
& 'I:\CrownDEX_Editorial_Polish_2026.ps1'
```

To **also publish source to GitHub** after the local production build passes:

```powershell
& 'I:\CrownDEX_Editorial_Polish_2026.ps1' -PublishGitHub
```

The GitHub script commits only website source/configuration. It excludes `node_modules`, `dist`, `.env*`, user backups, and private administrator configuration. It verifies the origin GitHub repository and never force-pushes. The current remote must be `Didarul-Habib/crowndex-portfolio` and the branch must be `main`.

If the code has already been changed since the V4 release, the installer refuses to overwrite unknown source changes.

## Live About content when Supabase is configured

The site's About paragraphs come from your Supabase `site_settings` record when connected. The installer updates local source defaults and the seed script for new projects, but **does not silently overwrite a live profile**.

To update an existing, unmodified default profile, run `supabase/update_default_about_copy.sql` in your Supabase SQL Editor, or edit About inside `/admin`. The SQL migration changes only the original seed values, not custom About text.

## Hosting without Netlify: Cloudflare Pages

1. Visit https://dash.cloudflare.com/ → Workers & Pages → Create application → Pages → Connect to Git.
2. Choose GitHub and select `Didarul-Habib/crowndex-portfolio`.
3. Framework preset: **Vite** (if available); production branch: **main**.
4. Build command: **npm run build**. Output directory: **dist**. Root directory: default project root.
5. If using Supabase, add **VITE_SUPABASE_URL** and **VITE_SUPABASE_PUBLISHABLE_KEY** to Pages environment variables, then rebuild. These are public client values; never add a service-role/secret key.
6. Deploy. Cloudflare issues a `*.pages.dev` URL and auto-deploys subsequent GitHub pushes.
7. Test `/admin` and X embeds. Keep credentials private. You may need to add the deployed domain to Supabase Authentication redirect URLs for link-based sign-in/recovery.

GitHub source publishing does not by itself deploy anything to Cloudflare; connecting the GitHub repository in Cloudflare is a one-time account action.

## Notes

- Real video cover images still require uploading actual frames or thumbnails through the admin panel.
- If you have already connected Netlify to your GitHub repository, pushing to `main` could trigger Netlify's own automatic build. Disable Netlify deploys first if you don't want that.
- If another unrelated commit exists on GitHub, this script stops instead of overwriting it.
