<!-- Release version: 1.0.1 -->

# CrownDEX Contact Inbox — setup and deployment

This is an additive feature for the existing CrownDEX React + Supabase project.
It does not replace the current authentication, admin authorization, portfolio,
creator-program, profile, Website Content CMS, media bucket or public website.

## What the feature does

- The public Contact form submits a validated enquiry to a Supabase Edge Function.
- Cloudflare Turnstile (free) verifies that the submission is not an automated bot.
- The Edge Function stores the message in `public.contact_messages`.
- The private `/admin` Inbox reads messages through the authenticated Supabase client.
- PostgreSQL RLS allows only accounts already listed in `public.admin_users` to read,
  update message state or delete messages.
- Supabase Realtime refreshes the Inbox and unread count when new rows arrive.
- Reply opens the visitor's email address in the administrator's default email app.
  No paid email-sending provider is used.

The Inbox captures messages sent through the CrownDEX website form. It does not
automatically import X DMs, Telegram messages or messages arriving in unrelated
email accounts. Those require separate platform integrations.

## 1. Create the free Cloudflare Turnstile widget

1. Open Cloudflare Dashboard → Turnstile.
2. Create a widget for `crowndex.pages.dev`.
3. Add any other domain actually used by the site (for example, a custom domain).
4. Choose the managed widget mode.
5. Copy the **site key** and **secret key**.

Turnstile is used to protect the public form. The secret key must never be placed
in frontend code or a `VITE_` variable.

## 2. Apply the additive database migration

Open Supabase Dashboard → SQL Editor and run the complete file:

`supabase/contact_inbox_migration.sql`

This creates only `public.contact_messages`, its indexes, RLS policies and
Realtime publication membership. It does not rerun `schema.sql`, alter admin
membership, or modify existing content tables.

The migration deliberately does not grant `anon` or `authenticated` permission
to insert messages. Public submissions must pass through the server-side
Turnstile-verified Edge Function.

## 3. Configure the public Turnstile site key

In Cloudflare Pages → your CrownDEX project → Settings → Environment variables,
add:

`VITE_TURNSTILE_SITE_KEY` = the Turnstile **site key**

Add it to both Production and Preview only if you intend to test preview
deployments. For local development, place the same public site key in the
ignored `.env.local` file. Never put the Turnstile secret in `.env.local`.

A Vite build reads `VITE_` variables at build time, so rebuild/redeploy the
frontend after adding or changing this value.

## 4. Configure and deploy the Supabase Edge Function

The function is located at:

`supabase/functions/submit-contact/index.ts`

Install/use the Supabase CLI and link it to the existing Supabase project.
Do not create a new project.

Set the function secrets (replace the example values with your actual values):

```powershell
supabase secrets set `
  TURNSTILE_SECRET_KEY="YOUR_TURNSTILE_SECRET_KEY" `
  ALLOWED_ORIGINS="https://crowndex.pages.dev,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4174,http://127.0.0.1:4174" `
  TURNSTILE_HOSTNAMES="crowndex.pages.dev"
```

If you use a custom domain, add its exact origin to `ALLOWED_ORIGINS` and its
hostname to `TURNSTILE_HOSTNAMES`. If you test a Cloudflare preview deployment,
add that exact origin/hostname too. Do not use a wildcard origin.

Supabase Edge Functions provide `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in their runtime environment. The function uses the
service-role key only on the server. Never copy it into the React application,
Cloudflare Pages frontend variables, Git or a public file.

Deploy the function with JWT gateway verification disabled because the public
visitor is not signed in. The function performs its own strict origin, field,
Turnstile and rate-limit checks:

```powershell
supabase functions deploy submit-contact --no-verify-jwt
```

## 5. Deploy the frontend

Use the existing CrownDEX release/publishing workflow. Do not replace the
repository's current working tree with an old archive. Build the frontend after
the Cloudflare Pages `VITE_TURNSTILE_SITE_KEY` variable has been saved.

## 6. Test the complete flow

1. Open the public website and submit a test enquiry using a real email address.
2. Complete the Turnstile security check.
3. Confirm the public form displays a success message only after the Edge Function
   reports that the row was saved.
4. Open `/admin` and sign in with the already-authorized administrator account.
5. Open **Inbox** and confirm the test enquiry appears.
6. Mark it read/unread, archive/restore it, and test Delete only with a disposable
   test message.
7. Reply by email and confirm that the visitor's address and subject are populated.
8. Test again from a phone and a desktop browser.

If the Inbox table is missing, the admin displays a setup note rather than
fabricating messages or counts.

## Free-plan and delivery notes

- No paid form provider, email API or third-party inbox subscription is required.
- Cloudflare Turnstile has a free plan.
- Supabase database and Edge Function usage remains subject to Supabase Free
  quotas, inactivity pausing and current plan limits.
- The message is stored in the database; no email notification is sent by this
  release. Open the Inbox to see new messages while the site is active.
- Reply uses the device's default email application. It does not send email
  directly from Supabase.
- The Edge Function applies a limit of five saved enquiries per IP hash per hour,
  in addition to Turnstile and a hidden honeypot field.
- Supabase Free projects may pause after a period of inactivity. If the project
  pauses, submissions cannot be stored until it is resumed.

## Existing source-file caution

The source snapshot supplied for this upgrade contains a modified
`supabase/schema.sql` whose contents are not SQL schema statements. This release
does not include, overwrite, execute or rely on that file. Do not run that file
against the existing production Supabase project. The new Inbox migration is a
separate, additive file and should be reviewed before it is run.
