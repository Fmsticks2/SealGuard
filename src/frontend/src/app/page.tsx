import Link from "next/link";

export default function Home() {
  return (
    <section className="grid gap-6">
      <div className="rounded-xl border p-6 bg-white/50">
        <h1 className="text-2xl font-semibold">SealGuard</h1>
        <p className="text-gray-600 mt-2">Connect your wallet and start verifying documents stored on Filecoin.</p>
        <div className="mt-4 flex items-center gap-3">
          <appkit-button>Connect Wallet</appkit-button>
          <Link href="/dashboard" className="px-3 py-2 border rounded">Go to Dashboard</Link>
        </div>
      </div>
    </section>
  );
}
