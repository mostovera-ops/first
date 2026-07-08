# Setup — Supabase, Google OAuth, Resend

This app needs a Supabase project for authentication (and, in later stages,
profiles, storage, and email). Everything Claude **cannot** do for you (it has
no access to your Supabase/Google/Resend accounts) is listed here. Follow the
sections in order.

> Secrets rule: only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` go in the
> client (`.env.local`). The **service-role key** and **Resend API key** live
> only in Supabase **Edge Function secrets** — never in the client, never in git.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick an org, name it (e.g. `flux`), set a strong database password, choose a
   region near you → **Create new project**. Wait ~2 min for provisioning.

## 2. Get the client keys → `.env.local`

1. In the project: **Project Settings** (gear, bottom-left) → **API**.
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys → `anon` `public`** → `VITE_SUPABASE_ANON_KEY`
3. In the repo root, copy the template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. Restart `npm run dev` after editing `.env.local` (Vite only reads env at
   startup). The yellow "not configured" banner on the auth screen should
   disappear.

## 3. Configure Auth URLs

**Authentication → URL Configuration**:

- **Site URL**: your app origin.
  - Local dev: `http://localhost:5173`
  - Production: `https://your-domain.com`
- **Redirect URLs** (add every origin you use — click **Add URL** for each):
  - `http://localhost:5173/`
  - `https://your-domain.com/` (and any Vercel preview domain you want to test)

These must match exactly (including the trailing `/`) — the app sends users
back to `window.location.origin + '/'` after email confirmation, Google, and
password-reset links.

## 4. Email provider + confirmation (double opt-in)

**Authentication → Providers → Email**:

- Ensure **Email** is **enabled**.
- Turn **Confirm email** **ON** (this enforces double opt-in — new email
  sign-ups can't use the app until they click the link).

> During local development Supabase's built-in email sender is rate-limited and
> may land in spam. For reliable delivery, connect a custom SMTP / Resend
> sender (covered in the Stage 4 email section, added later).

## 5. Log in with Google (OAuth)

You need a Google OAuth client, then paste its ID/secret into Supabase.

**A. Google Cloud Console** — <https://console.cloud.google.com>:

1. Create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill app
   name, support email, developer email → save. Add your email as a **Test
   user** while the app is unverified.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://your-domain.com`
   - **Authorized redirect URIs** — this is the **Supabase** callback, found in
     Supabase under **Authentication → Providers → Google** (labelled
     "Callback URL (for OAuth)"). It looks like:
     - `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`
   - Create → copy the **Client ID** and **Client secret**.

**B. Supabase** — **Authentication → Providers → Google**:

1. Toggle **Enable Sign in with Google** ON.
2. Paste the **Client ID** and **Client secret** from Google.
3. Save.

Google sign-in is persistent by default (Supabase stores the session and
auto-refreshes tokens), so users stay logged in across reloads.

## 6. Verify Stage 1

- `npm run dev`, open the app → you should see the **sign-in** screen (no
  banner once `.env.local` is set).
- **Sign up** with an email → "check your inbox" → click the link → you land
  back signed in.
- **Continue with Google** → Google consent → back to the app, signed in.
- **Forgot password** → email link → set-new-password screen → updated.
- Reload the page → you stay signed in.

---

## 7. Profiles table + Row Level Security (Stage 2)

The account page reads/writes a `profiles` row per user, protected by RLS so a
user can only see and edit their own row.

1. In Supabase: **SQL Editor → New query**.
2. Open `supabase/migrations/0001_profiles.sql` from this repo, paste its full
   contents, and **Run**. This creates:
   - the `profiles` table (id, email, first/last name, avatar fields,
     timestamps),
   - RLS policies (`select/insert/update/delete` limited to `auth.uid() = id`),
   - an `updated_at` trigger,
   - a `handle_new_user` trigger that auto-creates a profile row on sign-up and
     **prefills first/last name from Google** metadata when present.
3. Verify: **Table Editor → profiles** exists, and **Authentication → Policies**
   shows four policies on `public.profiles`.

No env changes are needed for this stage — the client uses the same anon key
and RLS enforces per-user access.

### Verify Stage 2

- Sign in, open the avatar menu (top-right) → **Account settings**.
- Your email shows with a **Password** or **Google** badge.
- Edit first/last name → it autosaves ("Saved" appears); reload → it persists.
- A Google sign-in should arrive with first/last name already filled in.

---

## 8. Avatar Storage bucket (Stage 3)

Uploaded avatars are stored in a public `avatars` bucket; each user can only
write inside their own `avatars/<user-id>/` folder.

**Option A — SQL (recommended):**
1. **SQL Editor → New query**, paste `supabase/migrations/0002_storage_avatars.sql`,
   and **Run**. It creates the public `avatars` bucket and four Storage
   policies (public read; insert/update/delete limited to the user's folder).

**Option B — Dashboard:**
1. **Storage → New bucket** → name `avatars`, toggle **Public bucket** ON →
   create.
2. Then still run the policy statements from
   `0002_storage_avatars.sql` (the `create policy … on storage.objects` parts)
   in the SQL Editor so uploads are restricted per user.

The preset animal renders are **not** uploaded here — they're static files you
add to `public/avatars/animals/<slug>.png` in the repo (see the README in that
folder). Missing files fall back to an emoji-on-gradient automatically.

### Verify Stage 3

- Account → **Avatar**: the grid shows 12 characters; a default is
  pre-selected (deterministic per user).
- Click a character → the header avatar + top-right menu update immediately.
- **Upload** → pick an image → position/zoom in the circle → **Save avatar** →
  it appears; reload → it persists (served from the `avatars` bucket).

---

_Stages 4–5 (Resend emails, account deletion) will be appended to this file as
those stages are built._
