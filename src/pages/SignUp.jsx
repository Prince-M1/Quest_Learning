import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // @ts-ignore
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Signup failed");
      }
   
      // ✅ Redirect to verification page
    navigate("/verify-email", { state: { email } });

    } catch (err) {
      setError(err.message || "Something went wrong.");
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
            Create your account
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 rounded-xl border border-gray-200 px-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full h-11 rounded-xl border border-gray-200 px-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full h-11 rounded-xl border border-gray-200 px-4 pl-10 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#0F172A] hover:bg-[#020617] text-white font-semibold mt-6"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>        
          </div>
      </div>
    </div>
  );
}
