"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        alert(error.message);
        return;
      }

      setSent(true);
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            SmartWatch
          </h1>

          <p className="text-slate-500 mt-2">
            Know what changed. Know what matters.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-7">

          <h2 className="text-2xl font-semibold text-slate-900">
            Forgot Password?
          </h2>

          {!sent ? (
            <>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                Enter your email address and we'll send you a
                password reset link.
              </p>

              <form
                onSubmit={handleReset}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 font-medium hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {loading
                    ? "Sending..."
                    : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="text-sm text-green-700">
                If an account exists with that email,
                we've sent a password reset link.
              </p>
            </div>
          )}

          <div className="text-center mt-6 pt-6 border-t border-slate-100">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              ← Back to Log In
            </Link>
          </div>

        </div>

      </div>
    </main>
  );
}