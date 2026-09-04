import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">

        <div className="bg-white rounded-2xl shadow-sm p-8">

          <p className="text-sm font-medium text-slate-500 mb-6">
            Log In or Create Account
          </p>

          <h1 className="text-4xl font-bold text-slate-900">
            SmartWatch
          </h1>

          <p className="text-slate-500 mt-3 mb-8">
            Know what changed. Know what matters.
          </p>

          <div className="space-y-3">

            <Link
              href="/login"
              className="block w-full rounded-xl bg-slate-900 text-white px-5 py-3.5 font-medium hover:bg-slate-800 transition"
            >
              Log In
            </Link>

            <Link
              href="/signup"
              className="block w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-5 py-3.5 font-medium hover:bg-slate-50 transition"
            >
              Create Account
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
}