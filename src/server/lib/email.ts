import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { env } from "~/env";
import { db } from "~/server/db";
import { emailLogs } from "~/server/db/schema";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendEmailOptions extends EmailMessage {
  emailType: string;
  userId?: string;
  notificationId?: number;
}

export interface EmailResult {
  id: number;
  providerId?: string;
  status: "sent" | "failed";
  errorMessage?: string;
}

function fromHeader(): string {
  return `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`;
}

function isDevelopmentOrTestSend(): boolean {
  return (
    env.NODE_ENV === "development" ||
    env.NODE_ENV === "test" ||
    !env.RESEND_API_KEY
  );
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<EmailResult> {
  const [log] = await db
    .insert(emailLogs)
    .values({
      userId: options.userId ?? null,
      notificationId: options.notificationId ?? null,
      emailType: options.emailType,
      recipientEmail: options.to,
      subject: options.subject,
      status: "pending",
    })
    .returning();

  if (!log) {
    return {
      id: -1,
      status: "failed",
      errorMessage: "Failed to create email log entry.",
    };
  }

  const now = new Date();

  if (isDevelopmentOrTestSend()) {
    console.log("[email] mock send", {
      to: options.to,
      subject: options.subject,
      emailType: options.emailType,
    });

    await db
      .update(emailLogs)
      .set({
        status: "sent",
        providerResponse: JSON.stringify({
          id: "mock",
          note: "logged in dev/test",
        }),
        sentAt: now,
      })
      .where(eq(emailLogs.id, log.id));

    return { id: log.id, providerId: "mock", status: "sent" };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: options.from ?? fromHeader(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Resend returned no data");
    }

    await db
      .update(emailLogs)
      .set({
        status: "sent",
        providerResponse: JSON.stringify(data),
        sentAt: now,
      })
      .where(eq(emailLogs.id, log.id));

    return { id: log.id, providerId: data.id, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(emailLogs)
      .set({
        status: "failed",
        errorMessage: message,
      })
      .where(eq(emailLogs.id, log.id));

    return { id: log.id, status: "failed", errorMessage: message };
  }
}

export async function sendBatch(
  options: SendEmailOptions[],
): Promise<EmailResult[]> {
  return Promise.all(options.map((option) => sendEmail(option)));
}
