/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Input } from "../components/Input";
import { Form } from "../components/Form";
import { SubmitButton } from "../components/Button";
import "../styles/login.css";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; fromForgot?: boolean };

  const [email, ] = useState(state?.email || "");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Redirect to login if page accessed improperly
  useEffect(() => {
    if (!state?.fromForgot) {
      navigate("/login");
    }
  }, [state, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetCode.trim()) {
      setError("Reset code is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode, newPassword }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      setSuccess("Password reset successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay">
        <div className="login-card glass-effect">
          <div className="login-header">
            <img src="/images/logo.png" alt="Logo" className="login-logo" />
            <h2>Reset Password</h2>
            <p className="text-gray">
              Enter your reset code and new password
            </p>
          </div>

          <Form onSubmit={handleResetPassword}>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <Input
              type="email"
              value={email}
              placeholder="Email Address"
              required
              readOnly
            />

            <Input
              type="text"
              value={resetCode}
              placeholder="Reset Code"
              required
              onChange={(e) => setResetCode(e.target.value)}
            />

            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              placeholder="New Password"
              required
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              placeholder="Confirm New Password"
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <label className="show-password">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword((prev) => !prev)}
              />{" "}
              Show Passwords
            </label>

            <SubmitButton
              variant="primary"
              className="login-btn"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </SubmitButton>

            <p style={{ marginTop: "10px" }}>
              <Link to="/login">Return to Login</Link>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
