import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { env } from "~/env";
import { notificationToTemplate, type NotificationType } from "~/lib/notifications";
import { db } from "~/server/db";
import { platformSettings } from "~/server/db/schema";
import { sendEmail } from "~/server/lib/email";
import { renderDigestEmail } from "~/server/lib/email/templates";
import {
  getUnreadNotificationsForUser,
  getUsersDueForDigest,
  markDigestSent,
} from "~/server/lib/notifications";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(): Promise<NextResponse> {
  if (env.CRON_SECRET) {
    const authorization = (await headers()).get("authorization");
    if (authorization !== `Bearer ${env.CRON_SECRET}`) {
      return unauthorized();
    }
  } else if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const [settings] = await db
    .select({ digestFrequency: platformSettings.digestFrequency })
    .from(platformSettings)
    .orderBy(desc(platformSettings.id))
    .limit(1);

  if (settings?.digestFrequency === "off") {
    return NextResponse.json({ processed: 0, reason: "digest_off" });
  }

  const dueUsers = await getUsersDueForDigest();
  let processed = 0;

  for (const user of dueUsers) {
    const unreadNotifications = await getUnreadNotificationsForUser(user.userId);
    if (unreadNotifications.length === 0) continue;

    const items = unreadNotifications.map((notification) => {
      const template = notificationToTemplate(
        notification.type as NotificationType,
        notification.payload,
      );
      return {
        title: template.title,
        body: template.body,
        href: template.href
          ? new URL(template.href, env.NEXT_PUBLIC_APP_URL).toString()
          : undefined,
      };
    });

    const { html, subject, text } = renderDigestEmail({
      name: user.name,
      notifications: items,
    });

    await sendEmail({
      emailType: "digest",
      to: user.email,
      subject,
      html,
      text,
      userId: user.userId,
    });

    await markDigestSent(user.userId);
    processed++;
  }

  return NextResponse.json({ processed, due: dueUsers.length });
}
