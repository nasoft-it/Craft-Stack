# CRAFTSTACK site — setup & deployment

Static site (no build step). Deploy the folder as-is to Netlify. To test locally use a web server (`python3 -m http.server 8000`); ES modules don't load from `file://`.

## What is enforced
- The whole site (nav, services, inquiry form, footer) lives in an inert `<template>` and is only inserted into the page **after** `js/auth.js` has found a Supabase session **and** the Supabase Auth server has validated it (`auth.getUser()`). A stored token or JS flag alone never unlocks anything.
- Signed-out, expired or invalid sessions stay on / return to the sign-in screen. Sign-out clears the session and reloads the page. Changes in other tabs are picked up via `onAuthStateChange`.
- `privacy.html` and `terms.html` stay public (linked from the sign-in screen).
- There is no guest/preview path. If `js/config.js` is empty the sign-in screen shows a setup message and every button is disabled.
- **Honest limit:** this is still a static site — the HTML/CSS/JS files themselves are downloadable by anyone. Never place private data in them. Private customer/project data must live in Supabase tables protected by **Row Level Security** (or another server), which check the signed-in user server-side. If you later need the page files themselves to be private, add a Netlify Edge Function that verifies the Supabase JWT.

## 1. Supabase project
1. https://supabase.com → New project (note the **Project ref**, e.g. `abcdefgh`).
2. Project Settings → API (or API Keys): copy the **Project URL** and the **publishable key** (`sb_publishable_…`) or legacy **anon** key. Never use or paste the `service_role` / secret key anywhere in this project.
3. Open `js/config.js` and set:
   - `supabaseUrl`: `https://<ref>.supabase.co`
   - `supabaseAnonKey`: the publishable/anon key
   - `siteUrl`: your Netlify URL, e.g. `https://your-site.netlify.app` (or your custom domain)
   Redeploy.

## 2. Redirect URLs (Authentication → URL Configuration)
- **Site URL:** your production URL (same as `siteUrl`).
- **Redirect URLs** (add each): `https://your-site.netlify.app/**`, your custom domain `https://yourdomain.com/**`, and for local testing `http://localhost:8000/**`. For Netlify deploy previews, optionally `https://*--your-site.netlify.app/**`.
Supabase rejects redirects not on this list, so unlisted domains cannot receive sessions.

## 3. Providers (Authentication → Providers)
**Email** (on by default)
- Keep **Confirm email** ON so users must verify their address.
- Set minimum password length to 8+ (the form requires 8).
- Supabase's built-in mailer is heavily rate-limited; for real users configure your own SMTP (Authentication → SMTP Settings).
- Optional: customise the confirmation / reset email templates.

**Google**
1. Google Cloud Console → APIs & Services → OAuth consent screen (configure), then Credentials → Create OAuth client ID → *Web application*.
2. Authorised redirect URI: `https://<ref>.supabase.co/auth/v1/callback`. Authorised JavaScript origin: your site URL.
3. Copy the Client ID and Client Secret into Supabase → Providers → Google → enable. (The secret goes **only** in the Supabase dashboard.)

**Apple** (requires a paid Apple Developer Program membership — an Apple cost, not part of this project)
1. Apple Developer → Identifiers: create an **App ID** with *Sign in with Apple*, then a **Services ID** (this is the client ID). Configure the Services ID: domain `<ref>.supabase.co`, return URL `https://<ref>.supabase.co/auth/v1/callback`.
2. Keys: create a *Sign in with Apple* key (download the `.p8`, note Key ID and your Team ID).
3. Generate the Apple client-secret JWT as described in Supabase's Apple guide (it expires every 6 months — set a reminder), then enter Services ID + secret in Supabase → Providers → Apple → enable.

The sign-in screen asks Supabase which providers are enabled and disables Google/Apple/Email buttons that aren't ("not set up yet"), so unconfigured flows never start.

## 4. Inquiry form
Set `inquiryEndpoint` in `js/config.js` (e.g. a Formspree URL or your own server endpoint). Until then the form says nothing was sent and offers a mailto fallback. Submitting requires a verified session in the browser; if your endpoint holds sensitive data, also verify the user's Supabase JWT on the server.

## Files
`index.html`, `css/styles.css`, `js/{main,auth,inquiry,scene,config}.js`, `assets/`, `privacy.html`, `terms.html`, `netlify.toml` (security headers).
