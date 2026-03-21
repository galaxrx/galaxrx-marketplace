/**
 * Minimal page to test if the app serves anything.
 * If you see "Debug OK" at /debug, the server works and the issue is in the home page or client code.
 */
export default function DebugPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0D1B2A",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Debug OK</h1>
      <p style={{ marginTop: "1rem", opacity: 0.8 }}>Server is responding. If you see this, try the home page: <a href="/" style={{ color: "#C9A84C" }}>/</a></p>
    </div>
  );
}
