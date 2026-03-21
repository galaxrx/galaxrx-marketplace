import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D1B2A",
        color: "rgba(255,255,255,0.9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>404</h1>
      <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>This page could not be found.</p>
      <Link
        href="/"
        style={{
          padding: "0.5rem 1rem",
          background: "#C9A84C",
          color: "#0D1B2A",
          borderRadius: "6px",
          fontWeight: "bold",
          textDecoration: "none",
        }}
      >
        Go home
      </Link>
    </div>
  );
}
