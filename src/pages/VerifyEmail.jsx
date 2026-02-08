import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Import your SVG
import ShieldTickIcon from "@/assets/svgexport-2.svg"; // Make sure path is correct

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || ""; // Email from signup

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);

  // Handle typing in each input
  const handleChange = (e, idx) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      const newCode = [...code];
      newCode[idx] = val;
      setCode(newCode);

      // Move focus forward if typed
      if (val && idx < inputRefs.current.length - 1) {
        inputRefs.current[idx + 1].focus();
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1].focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(paste)) {
      const newCode = paste.split("");
      setCode(newCode);
      newCode.forEach((_, i) => inputRefs.current[i]?.focus());
    }
    e.preventDefault();
  };

  // Verify OTP
  const handleVerify = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.join("") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Verification failed");

      localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/roleselection"); // Redirect to dashboard or main page
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/resend-otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});


      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend OTP");

      alert(data.message);

      // Start 30-second cooldown
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      alert(err.message || "Server error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-10">
        {/* Back link */}
        <button
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
          onClick={() => navigate("/login")}
        >
          ← Back to sign in
        </button>

        {/* Shield tick icon */}
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
            <img src={ShieldTickIcon} alt="Shield tick" className="w-8 h-8" />
          </div>
        </div>

        {/* Title & description */}
        <h2 className="text-3xl font-semibold text-center text-gray-900 mb-2">
          Verify your email
        </h2>
        <p className="text-sm text-gray-500 text-center mb-8">
          We've sent a 6-digit code to <br />
          <span className="font-medium text-gray-900">{email}</span>
        </p>

        {/* OTP Inputs */}
        <div className="flex justify-center gap-4 mb-6" onPaste={handlePaste}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`w-14 h-14 text-center text-xl rounded-lg border-2 ${
                digit ? "border-gray-900" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800 transition`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center mb-4">{error}</p>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={submitting || code.some((c) => !c)}
          className={`w-full h-14 rounded-xl text-white font-medium transition ${
            submitting || code.some((c) => !c)
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-900 hover:bg-black"
          }`}
        >
          {submitting ? "Verifying..." : "Verify email"}
        </button>

        {/* Resend */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Didn't receive the code?{" "}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={`underline text-gray-700 ${
              resendCooldown > 0 ? "cursor-not-allowed text-gray-400" : ""
            }`}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
          </button>
        </p>
      </div>
    </div>
  );
}
