// src/pages/ForgotPassword.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Input } from "../components/Input";
import { Form } from "../components/Form";
import { SubmitButton } from "../components/Button";
import { validateEmail } from "../utils/validation";
import "../styles/login.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Restrict direct access
  useEffect(() => {
    const state = location.state as { fromLogin?: boolean; fromReset?: boolean; email?: string };
    if (!state?.fromLogin && !state?.fromReset) {
      navigate("/login", { replace: true });
    } else if (state.email) {
      setEmail(state.email);
      checkEmail(state.email);
    }
  }, [location.state, navigate]);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // 🔍 Check if email exists in DB
  const checkEmail = async (value: string) => {
    const emailError = validateEmail(value);
    if (emailError) {
      setError(emailError);
      setEmailExists(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok || !data.exists) {
        setError("Email does not exist");
        setEmailExists(false);
      } else {
        setError("");
        setEmailExists(true);
      }
    } catch {
      setError("Unable to verify email");
      setEmailExists(false);
    }
  };

  // 📩 Generate reset code
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailExists) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/api/generate-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate reset code");

      setSuccess("Reset code has been sent to your email.");

      // Navigate to ResetPassword page with email prefilled
      setTimeout(() => {
        navigate("/reset-password", { state: { fromForgot: true, email } });
      }, 1000); // optional 1-second delay to show success message
    } catch (err: any) {
      setError(err.message || "Failed to generate reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay">
        <div className="login-card glass-effect">
          <div className="login-header">
            <img src="/images/logo.png" alt="School Logo" className="login-logo" />
            <h2>Forgot Password</h2>
            <p className="text-gray">Enter your registered email address</p>
          </div>

          <Form onSubmit={handleGenerateCode}>
            {success && <p className="success-message">{success}</p>}

            <Input
              type="email"
              value={email}
              placeholder="Email Address"
              required
              error={error}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setEmailExists(false);
              }}
              onBlur={() => checkEmail(email)}
            />

            <SubmitButton variant="primary" className="login-btn" disabled={!emailExists || loading}>
              {loading ? "Sending..." : "Generate Code"}
            </SubmitButton>

            <p className="login-footer">
              Remembered your password? <Link to="/login">Log In</Link>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
