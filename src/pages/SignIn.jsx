import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setToken as utilsSetToken } from "@/utils/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useGoogleLogin } from "@react-oauth/google"; // Changed to hook for custom button
import { useAuth } from "@/lib/AuthContext";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAppState, setToken: authSetToken } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

// --- Google Login Block ---
const googleLogin = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sending the access_token which starts with 'ya29.'
        body: JSON.stringify({ token: tokenResponse.access_token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Google login failed");

      // 1. Save token to context/localStorage
      authSetToken(data.token);
      
      // 2. Refresh the app state to ensure the user is recognized
      await checkAppState();
      
      // 3. Determine the destination
      const role = data.user?.account_type || data.user?.role;

      // 🚀 FORCE REFRESH REDIRECTS 
      // Using window.location.href ensures a clean state on the new dashboard
      if (!role) {
        window.location.href = "/roleselection";
      } else if (role === 'teacher') {
        window.location.href = "/teacherdashboard";
      } else {
        window.location.href = "/learninghub";
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError(err.message);
    }
  },
  onError: () => setError("Google sign-in failed"),
});

// --- Email Login Block ---
async function handleEmailLogin(e) {
  e.preventDefault();
  setError("");
  if (!email.trim() || !password) return setError("Please enter your email and password.");

  setSubmitting(true);
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Login failed.");
    
    authSetToken(data.token); 
    await checkAppState(); 

    const role = data.user?.account_type || data.user?.role;

    // 🚀 FORCE REFRESH REDIRECTS
    if (!role) {
      window.location.href = "/roleselection";
    } else if (role === 'teacher') {
      window.location.href = "/teacherdashboard";
    } else {
      window.location.href = "/learninghub";
    }

  } catch (err) {
    setError(err?.message || "Something went wrong.");
  } finally {
    setSubmitting(false);
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#eef2f7] flex items-center justify-center px-4">
      <Card className="w-full max-w-[460px] shadow-xl border border-gray-200 rounded-2xl">
        <CardContent className="p-8 space-y-5">
          {/* Circular Logo - 15% smaller */}
          <div className="flex justify-center">
            <div className="w-[6.8rem] h-[6.8rem] rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center">
              <img src={logo} alt="Quest Learning logo" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Welcome to Quest Learning</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
          </div>

          {/* SOCIAL BUTTONS SECTION */}
          <div className="space-y-3">
            {/* Google Button - Active */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-11 rounded-xl gap-2 font-medium" 
              onClick={() => googleLogin()}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" /><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" /><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" /><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" /></svg>
              Continue with Google
            </Button>

            {/* Facebook Button - Inactive (looks normal but does nothing) */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-11 rounded-xl gap-2 font-medium" 
              onClick={() => {}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Continue with Facebook
            </Button>

            {/* Microsoft Button - Inactive (looks normal but does nothing) */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-11 rounded-xl gap-2 font-medium" 
              onClick={() => {}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#F25022" d="M2 2h10v10H2z" /><path fill="#7FBA00" d="M12 2h10v10H12z" /><path fill="#00A4EF" d="M2 12h10v10H2z" /><path fill="#FFB900" d="M12 12h10v10H12z" /></svg>
              Continue with Microsoft
            </Button>
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl bg-[#111827] hover:bg-black text-white font-medium shadow-sm transition-all" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <button type="button" className="hover:text-gray-700 transition-colors" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
            <button type="button" className="hover:text-gray-700 transition-colors" onClick={() => navigate("/signup")}>Need an account? <span className="font-bold text-gray-900 ml-1">Sign up</span></button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}