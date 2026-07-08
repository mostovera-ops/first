// Flux — delete-account Edge Function
//
// Permanently deletes the *authenticated* caller's account:
//   1. sends the "account deleted" email (best effort)
//   2. removes their uploaded avatar(s) from Storage
//   3. deletes the auth user (this cascades their profile row via the FK)
//
// Requires the service-role key (admin). Deleting from the client is not
// possible, which is why this runs server-side.
//
// Deploy:  supabase functions deploy delete-account
// Secrets: RESEND_API_KEY, EMAIL_FROM (see SETUP.md, Stage 5)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { buildAccountDeletedEmail } from '../_shared/emails.ts';

const AVATAR_BUCKET = 'avatars';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their JWT.
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await authClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Not authenticated' }, 401);

    const admin = createClient(url, serviceKey);
    const firstName =
      (user.user_metadata?.first_name as string | undefined) ??
      (user.user_metadata?.given_name as string | undefined) ??
      null;

    // 1. Farewell email (don't block deletion if it fails).
    if (user.email) {
      try {
        await sendEmail(user.email, buildAccountDeletedEmail({ firstName }));
      } catch (_) {
        // ignore — deletion still proceeds
      }
    }

    // 2. Remove uploaded avatars in the user's folder.
    try {
      const { data: files } = await admin.storage
        .from(AVATAR_BUCKET)
        .list(user.id);
      if (files && files.length) {
        await admin.storage
          .from(AVATAR_BUCKET)
          .remove(files.map((f) => `${user.id}/${f.name}`));
      }
    } catch (_) {
      // ignore — proceed to delete the user
    }

    // 3. Delete the auth user (cascades the profile row).
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
