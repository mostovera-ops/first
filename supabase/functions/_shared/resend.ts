import type { EmailContent } from './emails.ts';

/**
 * Send an email through Resend. Reads secrets from the Edge Function env:
 *   RESEND_API_KEY  — your Resend API key
 *   EMAIL_FROM      — verified sender, e.g. "Flux <hello@yourdomain.com>"
 * Neither ever reaches the browser.
 */
export async function sendEmail(
  to: string,
  content: EmailContent,
): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY / EMAIL_FROM are not configured.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: content.subject,
      html: content.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }
}
