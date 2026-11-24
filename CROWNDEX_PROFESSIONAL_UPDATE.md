# CrownDEX — Professional Media & Motion Update

## Included

- 500 MB video file limit in the Admin Studio UI.
- Resumable TUS uploads in 6 MiB chunks for videos larger than 6 MiB, with progress and retry/resume support.
- Actual profile photo upload in Admin Studio → Profile & links.
- Profile photo shown in the header, hero identity and About section.
- Single active in-view video preview at a time; uploaded MP4/WebM previews remain muted and loop while visible.
- Refined scroll reveals, typography shimmer, card light sweeps, image orbit and subtle ambient movement.
- Removed the custom cursor overlay and shortened repetitive site copy.
- Preserved the existing CrownDEX palette, layout, content tables and admin authentication.

## Required Supabase migration

Run `supabase/crowndex_media_upgrade.sql` in Supabase SQL Editor before deploying the frontend update. It adds `site_settings.avatar_url`, permits the `profile/` storage path, and only shortens the original seeded About text if it has not been customized. Configure upload limits in the Supabase Dashboard as described below.

**Plan requirement:** Supabase Free has a 50 MB global file limit. A 500 MB upload requires a plan that allows a higher global limit. In Supabase Dashboard → Storage → Settings, set the Global file size limit to at least 500 MB. Then open Storage → Buckets → `portfolio-media` → Edit bucket and set its file-size limit to 500 MB. The bucket-level limit cannot exceed the global limit. On Free, leave both at 50 MB.

## Video behavior

- Uploaded MP4/WebM records with a saved `video_url` preview muted and looped when the card enters view.
- Only one preview plays at a time to reduce bandwidth.
- X-only records do not have a direct video file and therefore cannot autoplay in the card; they continue to open through the official X player.
- Visitors can open an uploaded video and use the full player controls to enable sound.

## Profile photo

After the migration and deployment, open `/admin` → Profile & links → Profile photo. Upload a JPG, PNG, WebP or AVIF image up to 8 MB, then click Save profile. The same image is used in the header, hero and About identity panel.

## Deploy

1. Run the PowerShell installer supplied with this update. It backs up the touched files and runs a production build; it does not alter `.env.local`, database data or deploy automatically.
2. If your plan allows 500 MB uploads, set the global limit and `portfolio-media` bucket limit in Supabase Storage settings. On Free, keep the 50 MB limit.
3. Run `supabase/crowndex_media_upgrade.sql` in Supabase SQL Editor.
4. Review the local preview.
5. Commit and push the source changes to `main`; the connected Cloudflare deployment will build them.
6. Test `/admin`, profile photo upload and one 100+ MB video if your plan permits it.
