// ─────────────────────────────────────────────────────────────────────────
//  Flux transactional email templates (Resend)
//
//  These are the emails NOT handled natively by Supabase Auth:
//    • welcome          — after a user confirms their address / first login
//    • account_deleted  — after a user deletes their account
//
//  Edit the copy freely — `wrap()` provides the shared shell (logo, footer),
//  each builder returns { subject, html }. Keep it warm and friendly.
// ─────────────────────────────────────────────────────────────────────────

const ACCENT = '#6e6cf6';
const APP_NAME = 'Flux';

/** Shared light-theme shell. Inline styles only (email clients are picky). */
function wrap(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f7;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c22;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e6ee;">
      <tr>
        <td style="padding:28px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:30px;height:30px;background:${ACCENT};border-radius:8px;text-align:center;color:#fff;font-weight:700;font-size:16px;line-height:30px;">F</td>
              <td style="padding-left:10px;font-weight:600;font-size:17px;color:#1c1c22;">${APP_NAME}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 32px 28px;font-size:14px;line-height:1.6;color:#33333b;">
          ${bodyHtml}
        </td>
      </tr>
    </table>
    <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:11px;color:#9a9aa6;">
      You’re receiving this because you have a ${APP_NAME} account.
    </p>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:9px;">${label}</a>`;
}

const hi = (firstName?: string | null) =>
  firstName ? `Hi ${firstName},` : 'Hi there,';

export interface EmailContent {
  subject: string;
  html: string;
}

/** Sent after the address is confirmed / first login. */
export function buildWelcomeEmail(opts: {
  firstName?: string | null;
  appUrl: string;
}): EmailContent {
  return {
    subject: `Welcome to ${APP_NAME} 👋`,
    html: wrap(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#1c1c22;">Welcome aboard!</h1>
      <p style="margin:0 0 14px;">${hi(opts.firstName)}</p>
      <p style="margin:0 0 14px;">
        Your ${APP_NAME} account is all set. ${APP_NAME} is your minimal,
        keyboard-friendly home for projects and Kanban boards — create a project,
        add a few lists, and start dragging cards around.
      </p>
      <p style="margin:0 0 22px;">
        We kept it fast and out of your way. Have fun. 🎉
      </p>
      <p style="margin:0 0 8px;">${button(opts.appUrl, `Open ${APP_NAME}`)}</p>
    `),
  };
}

/** Sent after a user deletes their account. */
export function buildAccountDeletedEmail(opts: {
  firstName?: string | null;
}): EmailContent {
  return {
    subject: `Your ${APP_NAME} account has been deleted`,
    html: wrap(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#1c1c22;">Your account was deleted</h1>
      <p style="margin:0 0 14px;">${hi(opts.firstName)}</p>
      <p style="margin:0 0 14px;">
        This confirms that your ${APP_NAME} account and profile have been
        permanently removed, along with any avatar you uploaded. We’re sorry to
        see you go.
      </p>
      <p style="margin:0 0 14px;">
        If this wasn’t you, please reply to this email right away and we’ll help.
      </p>
      <p style="margin:0;">Take care 👋</p>
    `),
  };
}
