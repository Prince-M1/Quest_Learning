import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) return setError("Please enter your email.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Something went wrong.");

      setMessage("Check your email for the password reset link.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="p-8">
          {/* Back link */}
          <button
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
            onClick={() => navigate("/login")}
          >
            <span>←</span> Back to sign in
          </button>

          <h1 className="text-2xl font-semibold text-gray-900 text-center mb-8">
            Forgot Password
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#0F172A] hover:bg-[#020617] text-white font-semibold mt-6"
            >
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
