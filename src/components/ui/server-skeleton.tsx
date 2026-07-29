export function ServerSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div
        className="skeleton-pulse"
        style={{
          height: 28,
          width: 240,
          borderRadius: 4,
          marginBottom: 24,
          backgroundColor: "var(--ant-color-fill-secondary, #f0f0f0)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              height: 120,
              borderRadius: 8,
              backgroundColor: "var(--ant-color-fill-secondary, #f0f0f0)",
            }}
          />
        ))}
      </div>

      <div
        className="skeleton-pulse"
        style={{
          height: 200,
          borderRadius: 8,
          marginTop: 24,
          backgroundColor: "var(--ant-color-fill-secondary, #f0f0f0)",
        }}
      />
    </div>
  );
}
