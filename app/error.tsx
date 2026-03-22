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

  const digest = error.digest;
  const isGenericProdMessage =
    typeof error.message === "string" &&
    error.message.includes("Server Components render");

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
        maxWidth: "36rem",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
      <p style={{ opacity: 0.8, marginBottom: "1rem", textAlign: "center", lineHeight: 1.5 }}>
        {isGenericProdMessage
          ? "A server error occurred while loading this page. The detailed message is hidden in production."
          : error.message || "An error occurred loading the page."}
      </p>
      {digest ? (
        <p
          style={{
            opacity: 0.65,
            marginBottom: "1.25rem",
            textAlign: "center",
            fontSize: "0.8rem",
            fontFamily: "ui-monospace, monospace",
            wordBreak: "break-all",
          }}
        >
          Reference: {digest}
          <span style={{ display: "block", marginTop: "0.5rem", fontFamily: "system-ui, sans-serif" }}>
            Share this code when contacting support, or match it to Vercel → your deployment → Logs.
          </span>
        </p>
      ) : null}
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
