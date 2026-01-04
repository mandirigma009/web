import { useEffect, useState, useRef } from "react";

import { useSearchParams, useNavigate } from "react-router-dom";
import "../styles/VerifyEmail.css";

type Status = "pending" | "success" | "error" | "expired";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const navigate = useNavigate();
  const hasVerified = useRef(false);

  const [message, setMessage] = useState<string>("Verifying email…");
  const [status, setStatus] = useState<Status>("pending");
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Countdown for redirect on expired
useEffect(() => {
   if (!["success", "expired", "error"].includes(status)) return;

  // Reset countdown when entering success/expired
  setCountdown(30);

  const interval = setInterval(() => {
    setCountdown((c) => {
      if (c <= 1) {
        clearInterval(interval);
        navigate("/login");
        return 0;
      }
      return c - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [status, navigate]);


  const resendVerification = async () => {
    if (!email) return;
    try {
      setResendLoading(true);
      const res = await fetch(
        `http://localhost:5000/api/resend-verification?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (res.ok) {
        setMessage("New verification email sent. Please check your inbox.");
        setStatus("pending");
      } else {
        setMessage(data.message || "Failed to resend verification email.");
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error. Please try again later.");
      setStatus("error");
    } finally {
      setResendLoading(false);
    }
  };

  // Verify token on load
useEffect(() => {
  if (!token || !email) {
    setStatus("error");
    setMessage("Invalid verification link.");
    return;
  }

  // 🛑 Prevent double execution (React 18 StrictMode fix)
  if (hasVerified.current) return;
  hasVerified.current = true;

  const verify = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/verify-email?token=${encodeURIComponent(
          token
        )}&email=${encodeURIComponent(email)}`
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Email successfully verified.");
      } else {
        if (data.message?.toLowerCase().includes("expired")) {
          setStatus("expired");
          setMessage("Token expired. You can request a new verification email.");
        } else {
          setStatus("error");
          setMessage(data.message || "Invalid or used token.");
        }
      }
    } catch (err) {
      console.error("Verify error:", err);
      setStatus("error");
      setMessage("Network error. Please try again later.");
    }
  };

  verify();
}, [token, email, navigate]);


  // Spinner SVG
  const spinner = (
    <svg className="verify-spinner" width="24" height="24" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" stroke="#cbd5e1" strokeWidth="5" opacity="0.6" />
      <path fill="#2563eb" d="M25 5a20 20 0 1 0 20 20">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );

  return (
    <div className="verify-container">
      <div className="verify-box">
        <h2>Email Verification</h2>

        {status === "pending" && (
          <div className="verify-msg pending">
            {spinner} <span>{message}</span>
          </div>
        )}

        {(status === "success" || status === "error") && (
          <>
            <p className={`verify-msg ${status}`}>{message}</p>
            <p className="verify-note">
              You will be redirected to login in {countdown}s.
               </p>
                <p>
            <button className="verify-button" onClick={() => navigate("/login")}>
              Go to login now
            </button>
            </p>
          </>
        )}

        {status === "expired" && (
          <>
            <p className="verify-msg error">{message}</p>
            <button
              className="verify-button"
              disabled={resendLoading}
              onClick={resendVerification}
            >
              {resendLoading ? "Sending..." : "Resend Verification Email"}
            </button>
            <p className="verify-note">
              You will be redirected to login in {countdown}s. <button onClick={() => navigate("/login")} className="verify-link">Go now</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
