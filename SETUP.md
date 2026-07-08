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

**Custom emoji avatars:** the "choose your own emoji" option needs the
`avatar_emoji` column. If you ran `0001_profiles.sql` from this repo it's
already included. If you created the `profiles` table before that, run
`supabase/migrations/0003_avatar_emoji.sql` once (it's idempotent).

### Verify Stage 3

- Account → **Avatar**: the grid shows 12 characters; a default is
  pre-selected (deterministic per user).
- Click a character → the header avatar + top-right menu update immediately.
- **Upload** → pick an image → position/zoom in the circle → **Save avatar** →
  it appears; reload → it persists (served from the `avatars` bucket).

---

## 9. Transactional emails (Stage 4)

Two kinds of email:

| Email | How it's sent |
| :-- | :-- |
| **Confirm signup**, **Reset password** | Native Supabase Auth templates (edit the HTML in the dashboard) |
| **Welcome**, **Account deleted** | Supabase **Edge Function** → **Resend** |

### 9a. Run the migration

**SQL Editor** → run `supabase/migrations/0004_welcomed_at.sql` (adds a
`welcomed_at` column so the welcome email is sent only once).

### 9b. Native templates (confirm + reset)

**Authentication → Email Templates**:

1. **Confirm signup** → paste `supabase/templates/confirm-signup.html`.
2. **Reset password** → paste `supabase/templates/reset-password.html`.

Edit the wording anytime — these files are the source of truth.

> For reliable delivery of the native emails, point Supabase at Resend's SMTP:
> **Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**,
> host `smtp.resend.com`, port `465`, username `resend`, password = your Resend
> API key, sender = your verified address. (Optional but recommended.)

### 9c. Resend account + sender domain

1. Create an account at <https://resend.com>.
2. **Domains → Add Domain**, add the DNS records they show at your registrar,
   and wait for it to verify. (For a quick test you can use Resend's
   `onboarding@resend.dev` sender to your own address without a domain.)
3. **API Keys → Create API Key**, copy it (starts with `re_`).

### 9d. Deploy the Edge Function + secrets

You need the Supabase CLI (<https://supabase.com/docs/guides/cli>):

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# Secrets (server-side only — never in the client):
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set EMAIL_FROM="Flux <hello@yourdomain.com>"
supabase secrets set APP_URL="https://your-domain.com"

supabase functions deploy send-email
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected into functions
automatically — you don't set those.

### Verify Stage 4

- Sign up with email → you get the branded **Confirm signup** email → confirm.
- First confirmed login → a **Welcome** email arrives (sent once).
- **Forgot password** → the branded **Reset password** email arrives.
- Edit any template file and re-deploy / re-paste to change the copy.

---

_Stage 5 (account deletion) will be appended to this file next._
