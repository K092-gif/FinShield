import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to FinShield
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Advanced Portfolio Management & Simulation Platform
          </p>
          <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200">
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}
