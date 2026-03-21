"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
      <p style={{ opacity: 0.8, marginBottom: "1.5rem", textAlign: "center" }}>
        {error.message || "An error occurred loading the page."}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1rem",
          background: "#C9A84C",
          color: "#0D1B2A",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
