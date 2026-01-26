/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Form } from "../components/Form";
import { SubmitButton } from "../components/Button";
import { validateEmail, validatePassword } from "../utils/validation";
import "../styles/login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [shake, setShake] = useState(false);



  useEffect(() => {
  const checkAuth = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/me", {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) navigate("/dashboard");
    } catch {
      // silent
    }
  };
  checkAuth();
}, [navigate]);


      useEffect(() => {
            if (!lockedUntil) return;

            const interval = setInterval(() => {
              const now = new Date().getTime();
              const lockTime = new Date(lockedUntil).getTime();
              const diff = lockTime - now;

              if (diff <= 0) {
                setIsLocked(false);
                setLockedUntil(null);
                setCountdown("");
                clearInterval(interval);
                return;
              }

              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

              setCountdown(`Try again in ${hours}h ${minutes}m`);
            }, 1000);

            return () => clearInterval(interval);
      }, [lockedUntil]);

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError || "", password: passwordError || "" });
      return;
    }

    setErrors({});
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

     const data = await res.json();

      if (!res.ok) {
        const error: any = new Error(data.message || "Login failed");
        error.remainingAttempts = data.remainingAttempts;
        error.locked = data.locked;
        error.lockedUntil = data.lockedUntil;
        throw error;
      }



      setSuccess("Login successful! Redirecting...");
      setEmail("");
      setPassword("");

      navigate("/dashboard");
    } catch (err: any) {
  setShake(true);
  setTimeout(() => setShake(false), 400);

  if (err.locked) {
    setIsLocked(true);
    setLockedUntil(err.lockedUntil);
    setErrors({ password: err.message });
    return;
  }

  if (err.remainingAttempts !== undefined) {
    setRemainingAttempts(err.remainingAttempts);
  }

  setErrors({ password: err.message || "Invalid credentials" });
}

  };

  return (
    <div className="login-page">
      <div className="login-overlay">
        <div className="login-card glass-effect">
          <div className="login-header">
            <img src="/images/logo.png" alt="School Logo" className="login-logo" />
            <h2>Welcome Back</h2>
            <p className="text-gray">Log in to your account</p>
          </div>
<br>
</br>
          <Form onSubmit={handleSubmit}>
            {success && <p className="success-message">{success}</p>}

            <Input
              type="email"
              disabled={isLocked}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  email: validateEmail(e.target.value) || "",
                }));
              }}
              placeholder="Email Address"
              required
              error={errors.email}
            />

            <Input
              type={showPassword ? "text" : "password"}
              disabled={isLocked}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  password: validatePassword(e.target.value) || "",
                }));
              }}
              placeholder="Password"
              required
              error={errors.password}
            />

            {remainingAttempts !== null && !isLocked && (
             <div
                className={`lock-warning ${
                  remainingAttempts <= 1
                    ? "danger"
                    : remainingAttempts <= 3
                    ? "warning"
                    : ""
                }`}
              >
                You have <strong>{remainingAttempts}</strong> attempt
                {remainingAttempts > 1 ? "s" : ""} left
             </div>
            )}


        <div className="show-forgot-container">
          <label className="show-password">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword((prev) => !prev)}
            />{" "}
            Show Password
          </label>

          {/* Hide Forgot Password link if the account is locked */}
          {!isLocked && (
            <span
              className="forgot-password-label"
              style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
              onClick={() =>
                navigate("/forgot-password", { state: { fromLogin: true, email } })
              }
            >
              Forgot Password?
            </span>
          )}
        </div>


        {isLocked && (
          <div className="lock-warning">
            {countdown && (
              <p className="lock-countdown">
                {countdown}
              </p>
            )}

            <p>
              Please reset your password to regain access immediately.
            </p>

            <button
              type="button" 
              className="reset-link"
              onClick={() =>
                navigate("/forgot-password", { state: { email } })
              }
            >
              Reset Password
            </button>
          </div>
        )}



           <SubmitButton
                variant="primary"
                className={`login-btn ${shake ? "shake" : ""}`}
                disabled={isLocked}
              >
            Log In
        </SubmitButton>


            <p className="login-footer">
              Don’t have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default Login;
