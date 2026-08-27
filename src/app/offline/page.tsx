import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — Modern E-Learning Portal",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f5f5f5",
        color: "#262626",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          padding: 32,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: 22 }}>You are offline</h1>
        <p style={{ margin: "0 0 24px", lineHeight: 1.5, color: "#595959" }}>
          Some features need a network connection. Cached pages and course
          content are still available, and your progress will sync when you
          reconnect.
        </p>
        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            padding: "10px 20px",
            background: "#1677ff",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 6,
            minHeight: 44,
            lineHeight: "24px",
          }}
        >
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}
