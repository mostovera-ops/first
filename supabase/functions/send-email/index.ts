// Flux — send-email Edge Function
//
// Sends a transactional email to the *authenticated* caller's own address.
// The recipient is derived from the caller's JWT, never from the request body,
// so it can't be used to email arbitrary people.
//
// Deploy:  supabase functions deploy send-email
// Secrets: RESEND_API_KEY, EMAIL_FROM, APP_URL (see SETUP.md, Stage 4)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { buildWelcomeEmail } from '../_shared/emails.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // Resolve the caller from their JWT.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.email) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const { type } = (await req.json().catch(() => ({}))) as {
      type?: string;
    };

    const firstName =
      (user.user_metadata?.first_name as string | undefined) ??
      (user.user_metadata?.given_name as string | undefined) ??
      null;

    if (type === 'welcome') {
      const appUrl = Deno.env.get('APP_URL') ?? 'https://example.com';
      await sendEmail(user.email, buildWelcomeEmail({ firstName, appUrl }));
      return json({ ok: true });
    }

    return json({ error: `Unknown email type: ${type}` }, 400);
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
