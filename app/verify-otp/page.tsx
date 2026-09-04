"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

export default function VerifyOtpPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        alert(error.message);
        return;
      }

      setStep("otp");
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) {
        alert(error.message);
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("A new verification code has been sent.");
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

          {step === "phone" ? (
            <>
              <h2 className="text-2xl font-semibold text-slate-900">
                Mobile Login
              </h2>

              <p className="text-sm text-slate-500 mt-2 mb-6">
                Enter your mobile number to receive a verification code.
              </p>

              <form
                onSubmit={sendOtp}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Mobile number
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
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
                    : "Send Verification Code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-slate-900">
                Verify Your Number
              </h2>

              <p className="text-sm text-slate-500 mt-2 mb-6">
                Enter the 6-digit code sent to {phone}.
              </p>

              <form
                onSubmit={verifyOtp}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Verification Code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="123456"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 font-medium hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </form>

              <button
                onClick={resendOtp}
                className="w-full mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Resend Code
              </button>

              <button
                onClick={() => setStep("phone")}
                className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
              >
                ← Change mobile number
              </button>
            </>
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