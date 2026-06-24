import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--bg-main), var(--bg-sub))" }}>
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4" style={{ color: "var(--text-main)", letterSpacing: "-1px" }}>
            Welcome to FinShield
          </h1>
          <p className="text-xl mb-8" style={{ color: "var(--text-muted)" }}>
            Advanced Portfolio Management & Simulation Platform
          </p>
          <Link href="/login" className="btn btn-primary" style={{ padding: "14px 32px", fontSize: "16px", borderRadius: "8px" }}>
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}
