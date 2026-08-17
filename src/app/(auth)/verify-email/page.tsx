"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Result, Spin, Typography } from "antd";

import { authClient } from "~/server/better-auth/client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Missing verification token.");
      return;
    }

    void authClient.verifyEmail(
      { query: { token } },
      {
        onSuccess: () => setStatus("success"),
        onError: (ctx) => {
          setStatus("error");
          setErrorMessage(ctx.error.message ?? "Verification failed.");
        },
      },
    );
  }, [token]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card style={{ width: 440, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin size="large" />
            <Typography.Paragraph
              style={{ marginTop: 16, marginBottom: 0, color: "#6b7280" }}
            >
              Verifying your email address…
            </Typography.Paragraph>
          </div>
        )}

        {status === "success" && (
          <Result
            status="success"
            title="Email verified"
            subTitle="Your email address has been verified. You can now sign in."
            extra={
              <Link href="/login" passHref>
                <Button type="primary">Sign in</Button>
              </Link>
            }
          />
        )}

        {status === "error" && (
          <Result
            status="error"
            title="Verification failed"
            subTitle={errorMessage ?? "We couldn't verify your email address."}
            extra={
              <Link href="/login" passHref>
                <Button type="primary">Back to sign in</Button>
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}
