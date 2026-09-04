"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setUpdated(true);
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
            Reset Password
          </h2>

          {!updated ? (
            <>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                Create a new password for your SmartWatch account.
              </p>

              <form
                onSubmit={handleUpdatePassword}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    New Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 font-medium hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {loading
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </form>
            </>
          ) : (
            <div className="mt-5">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <p className="text-sm text-green-700">
                  Your password has been updated successfully.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full text-center mt-5 rounded-xl bg-slate-900 text-white px-4 py-3 font-medium hover:bg-slate-800 transition"
              >
                Go to Log In
              </Link>
            </div>
          )}

        </div>

      </div>
    </main>
  );
}