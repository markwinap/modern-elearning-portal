import { and, eq, isNull, sql } from "drizzle-orm";

import {
  notificationToTemplate,
  type NotificationType,
} from "~/lib/notifications";
import { env } from "~/env";
import { db } from "~/server/db";
import {
  notificationPreferences,
  notifications,
  user,
} from "~/server/db/schema";
import { sendEmail } from "./email";
import { renderNotificationEmail } from "./email/templates";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  sendEmail?: boolean;
}

export async function ensureNotificationPreferences(userId: string) {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId })
    .returning();

  return created;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      payload: input.payload,
    })
    .returning();

  if (!notification) {
    throw new Error("Failed to create notification");
  }

  if (input.sendEmail !== false) {
    await sendNotificationEmail(notification).catch(() => undefined);
  }

  return notification;
}

function toAbsoluteUrl(path?: string): string | undefined {
  if (!path) return undefined;
  try {
    return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
  } catch {
    return undefined;
  }
}

export async function sendNotificationEmail(notification: {
  id: number;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  const preferences = await ensureNotificationPreferences(notification.userId);
  if (!preferences?.emailEnabled) return;

  const [recipient] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, notification.userId))
    .limit(1);

  if (!recipient) return;

  const template = notificationToTemplate(
    notification.type as NotificationType,
    notification.payload,
  );

  await sendEmail({
    emailType: notification.type,
    to: recipient.email,
    ...renderNotificationEmail({
      name: recipient.name,
      title: template.title,
      body: template.body,
      actionUrl: toAbsoluteUrl(template.href),
      actionLabel: template.hrefLabel,
    }),
    userId: notification.userId,
    notificationId: notification.id,
  });
}

interface UserDigestRow {
  userId: string;
  name: string;
  email: string;
  digestFrequency: "off" | "daily" | "weekly";
  lastDigestSentAt: Date | null;
}

export async function getUsersDueForDigest(): Promise<UserDigestRow[]> {
  const rows = await db
    .select({
      userId: notificationPreferences.userId,
      name: user.name,
      email: user.email,
      digestFrequency: notificationPreferences.digestFrequency,
      lastDigestSentAt: notificationPreferences.lastDigestSentAt,
    })
    .from(notificationPreferences)
    .innerJoin(user, eq(notificationPreferences.userId, user.id))
    .where(
      and(
        eq(notificationPreferences.emailEnabled, true),
        sql`${notificationPreferences.digestFrequency} != 'off'`,
        sql`(${notificationPreferences.lastDigestSentAt} is null or ${notificationPreferences.lastDigestSentAt} <= now() - interval '1 day')`,
      ),
    );

  return rows
    .filter((row) => {
      if (!row.lastDigestSentAt) return true;
      const thresholdHours = row.digestFrequency === "weekly" ? 7 * 24 : 24;
      const cutoff = Date.now() - thresholdHours * 60 * 60 * 1000;
      return row.lastDigestSentAt.getTime() <= cutoff;
    })
    .map((row) => ({
      ...row,
      digestFrequency: row.digestFrequency,
    }));
}

export async function getUnreadNotificationsForUser(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .orderBy(sql`${notifications.createdAt} desc`)
    .limit(25);
}

export async function markDigestSent(userId: string) {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(notificationPreferences)
      .set({ lastDigestSentAt: new Date() })
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db
      .insert(notificationPreferences)
      .values({ userId, lastDigestSentAt: new Date() });
  }
}
