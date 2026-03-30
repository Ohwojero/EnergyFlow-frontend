export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4">You’re Offline</h1>
        <p className="text-lg mb-6">
          EnergyFlow is currently unavailable because you are offline. Please check your network
          connection and try again. Your data is still available in the PWA cache if you previously
          visited this page.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition"
        >
          Go Home
        </a>
      </div>
    </main>
  )
}
