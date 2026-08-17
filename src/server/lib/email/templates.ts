import { env } from "~/env";

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function layout({
  title,
  preview,
  body,
}: {
  title: string;
  preview: string;
  body: string;
}): RenderedEmail {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const platformName = env.EMAIL_FROM_NAME ?? "Modern E-Learning Portal";

  return {
    subject: title,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; background: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #1677ff; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px; }
    .button { display: inline-block; background: #1677ff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 16px 0; }
    .footer { padding: 24px; text-align: center; color: #6b7280; font-size: 12px; background: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;font-size:20px;">${escapeHtml(platformName)}</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p style="margin:0;">${escapeHtml(preview)}</p>
      <p style="margin:8px 0 0;"><a href="${appUrl}" style="color:#6b7280;">${appUrl}</a></p>
    </div>
  </div>
</body>
</html>`,
    text: toText(title) + "\n\n" + stripHtml(body) + `\n\n${appUrl}`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderVerificationEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}): RenderedEmail {
  return layout({
    title: "Verify your email address",
    preview: "Click the link to verify your email and start learning.",
    body: `<p>Hi ${escapeHtml(name)},</p>
<p>Thanks for signing up. Please confirm your email address by clicking the button below.</p>
<p><a href="${url}" class="button">Verify email address</a></p>
<p style="color:#6b7280;font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br/>${url}</p>`,
  });
}

export function renderPasswordResetEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}): RenderedEmail {
  return layout({
    title: "Reset your password",
    preview: "Reset your password for your learning account.",
    body: `<p>Hi ${escapeHtml(name)},</p>
<p>We received a request to reset your password. Click the button below to set a new password.</p>
<p><a href="${url}" class="button">Reset password</a></p>
<p style="color:#6b7280;font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br/>${url}</p>
<p style="color:#6b7280;font-size:12px;">If you did not request a password reset, you can safely ignore this email.</p>`,
  });
}

export interface NotificationEmailData {
  name: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function renderNotificationEmail({
  name,
  title,
  body,
  actionUrl,
  actionLabel,
}: NotificationEmailData): RenderedEmail {
  const action = actionUrl
    ? `<p><a href="${actionUrl}" class="button">${escapeHtml(actionLabel ?? "View")}</a></p>`
    : "";

  return layout({
    title,
    preview: body,
    body: `<p>Hi ${escapeHtml(name)},</p>
<p>${escapeHtml(body)}</p>
${action}`,
  });
}

export interface DigestNotificationItem {
  title: string;
  body: string;
  href?: string;
}

export function renderDigestEmail({
  name,
  notifications,
}: {
  name: string;
  notifications: DigestNotificationItem[];
}): RenderedEmail {
  const listItems = notifications
    .map((item) => {
      const link = item.href
        ? `<br/><a href="${item.href}">${escapeHtml(item.href)}</a>`
        : "";
      return `<li style="margin-bottom:12px;"><strong>${escapeHtml(item.title)}</strong><br/>${escapeHtml(item.body)}${link}</li>`;
    })
    .join("");

  return layout({
    title: `Your latest updates`,
    preview: `You have ${notifications.length} unread notification${notifications.length === 1 ? "" : "s"}.`,
    body: `<p>Hi ${escapeHtml(name)},</p>
<p>Here is a summary of your recent notifications:</p>
<ul>${listItems}</ul>
<p><a href="${env.NEXT_PUBLIC_APP_URL}/notifications" class="button">View all notifications</a></p>`,
  });
}
