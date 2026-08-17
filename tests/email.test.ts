// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_TYPES,
  notificationToTemplate,
  type NotificationType,
} from "~/lib/notifications";
import { sendEmail } from "~/server/lib/email";
import {
  renderDigestEmail,
  renderNotificationEmail,
} from "~/server/lib/email/templates";

describe("notificationToTemplate", () => {
  it("returns expected title and body for an announcement", () => {
    const result = notificationToTemplate("announcement_posted", {
      courseTitle: "Intro to TypeScript",
      title: "New assignment available",
      courseSlug: "intro-to-typescript",
    });

    expect(result.title).toBe("New assignment available");
    expect(result.body).toContain("Intro to TypeScript");
    expect(result.href).toBe("/courses/intro-to-typescript");
  });

  it("returns expected body for a grade posted notification", () => {
    const result = notificationToTemplate("grade_posted", {
      courseTitle: "Advanced React",
      rawScore: 85,
      maxScore: 100,
    });

    expect(result.title).toBe("Grade posted");
    expect(result.body).toContain("85/100");
    expect(result.href).toBe("/grades");
  });

  it("falls back gracefully for unknown payload shapes", () => {
    const result = notificationToTemplate("discussion_message", {});

    expect(result.title).toBe("New discussion message");
    expect(result.href).toBeUndefined();
  });
});

describe("renderNotificationEmail", () => {
  it("renders an email with a call-to-action link", () => {
    const rendered = renderNotificationEmail({
      name: "Alice",
      title: "Enrollment approved",
      body: "Your enrollment request for Intro to TypeScript was approved.",
      actionUrl: "http://localhost:3000/courses/intro-to-typescript/learn",
      actionLabel: "Start learning",
    });

    expect(rendered.subject).toBe("Enrollment approved");
    expect(rendered.html).toContain("Alice");
    expect(rendered.html).toContain("Start learning");
    expect(rendered.html).toContain(
      "http://localhost:3000/courses/intro-to-typescript/learn",
    );
    expect(rendered.text).toContain("Intro to TypeScript");
  });
});

describe("renderDigestEmail", () => {
  it("aggregates multiple notifications into one email", () => {
    const rendered = renderDigestEmail({
      name: "Bob",
      notifications: [
        { title: "Announcement", body: "A new assignment is available" },
        { title: "Grade posted", body: "You scored 90/100" },
      ],
    });

    expect(rendered.subject).toBe("Your latest updates");
    expect(rendered.html).toContain("Announcement");
    expect(rendered.html).toContain("Grade posted");
    expect(rendered.html).toContain("View all notifications");
    expect(rendered.text).toContain("You scored 90/100");
  });

  it("uses singular wording for a single notification", () => {
    const rendered = renderDigestEmail({
      name: "Carol",
      notifications: [{ title: "Reminder", body: "Course starts tomorrow" }],
    });

    expect(rendered.html).toContain("1 unread notification");
  });
});

describe("sendEmail", () => {
  it("logs the email in test mode without throwing", async () => {
    const result = await sendEmail({
      emailType: "test",
      to: "student@example.com",
      subject: "Test email",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result.status).toBe("sent");
    expect(result.providerId).toBe("mock");
  });
});

describe("notification type union", () => {
  it("includes all expected types", () => {
    const types: NotificationType[] = [...NOTIFICATION_TYPES];
    expect(types).toContain("enrollment_request");
    expect(types).toContain("enrollment_approved");
    expect(types).toContain("enrollment_rejected");
  });
});
