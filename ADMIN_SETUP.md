# CrownDEX V4 — secure admin studio

The portfolio is a React/Vite website hosted on Netlify. Its `/admin` route is a **real admin interface**, but cloud editing requires a one-time Supabase project. The local V4 build works immediately with your existing five X posts even before Supabase is connected.

## 1. Set up the database (one time)

1. Visit [Supabase](https://supabase.com/dashboard) and create a project (the free tier may be sufficient for a small demo; storage, file size and bandwidth depend on your account limits).
2. Open **SQL Editor**, start a new query, paste all of `supabase/schema.sql` and run it. This creates the content tables, storage bucket and security policies and seeds the five genuine X posts.
3. Go to **Authentication → Users**, create or invite a user for yourself. In **Authentication → Providers → Email**, disable public signups if appropriate for your project. Confirm your own account's email/password setup.
4. Open `supabase/promote_admin.sql` in the project folder, replace `YOUR-ADMIN-EMAIL@EXAMPLE.COM` with the exact email address of the authenticated user you just created, then run it in Supabase **SQL Editor**. Verify the final SELECT returns exactly the intended administrator(s). **Do not use SQL to set or store a password.**
5. In Supabase **Project Settings → API Keys**, copy the Project URL and the `sb_publishable_...` key. **Never use `service_role`, `sb_secret_...`, or a database password in the frontend.**

Security is enforced by PostgreSQL Row Level Security (RLS) and storage policies, not by hiding `/admin`. Only members of `admin_users` can create, edit, upload or delete. Public users can read only published records. Public files in `portfolio-media` can be viewed by anyone with the URL, so **never upload sensitive/private videos or documents** there. Draft video records are hidden but uploaded files themselves are publicly reachable if their URL is known.

## 2. Connect the site in PowerShell

After installing CrownDEX V4, run:

```powershell
Set-Location 'I:\portfolio-site'
.\setup-admin.ps1
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4174 --strictPort
```

Open **http://127.0.0.1:4174/admin**, sign in with the account you created. Visit the portfolio at **http://127.0.0.1:4174/**.

To connect the deployed Netlify site later, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the same public values in the Netlify site environment variables and **redeploy**. Configure your Supabase Auth site URL/redirect allow list to include your eventual Netlify domain if you enable email links or recovery flows. Keep the admin password private.

## 3. Content management

- **Portfolio & videos:** Add an X status URL (official X viewer) or upload an MP4/WebM. Videos max 50 MB in this package, with hosting subject to your Supabase plan. Edit titles/categories, upload a JPG/PNG/WebP/AVIF cover (max 8 MB), mark Featured, publish/unpublish, change order, or remove a project.
- **Creator programs:** Add actual program names, role, description, URL, logo; publish/unpublish, reorder and remove.
- **Profile & links:** Edit both About paragraphs, X profile and Telegram URL.
- **Overview:** Published/draft counts and shortcuts. No fake social or view stats.

Changes in Supabase appear on your site after refresh, and when visitors return to the tab. No Git push is needed for admin content changes. To change source code, you still need a build/deploy workflow.

**Files retained after deletion:** Deleting a portfolio/program record does **not** automatically delete uploaded media from Supabase Storage. This prevents accidental data loss. Unused files can be manually removed in **Supabase → Storage → portfolio-media** by the owner.

## 4. Important limitations

- This installer does not create the Supabase cloud project or admin account for you. Those require your action in your own Supabase dashboard.
- Uploaded videos are served directly as standard MP4/WebM, without adaptive transcoding. For larger productions, prefer posting the video on X and adding its URL or use a video hosting provider.
- X oEmbed metadata is a build-time fallback for the original five records. New admin-added X links should include their own title, as the static build does not fetch newly added posts at runtime.
- Without Supabase configured, `/admin` shows setup instructions and your local portfolio remains read-only with the original five works.
- You should inspect and approve the local V4 website **before any GitHub push or Netlify deployment**.
