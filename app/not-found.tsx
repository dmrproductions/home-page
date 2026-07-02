export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "4rem", fontWeight: 800, margin: 0 }}>404</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>Page not found</p>
        <a href="/" style={{ color: "#0070f3", textDecoration: "none", marginTop: "1rem", display: "inline-block" }}>← Go home</a>
      </div>
    </div>
  )
}
