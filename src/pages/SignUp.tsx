 /* Sign Up Tsx */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Form } from "../components/Form";
import { SubmitButton } from "../components/Button";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "../utils/validation";
import "../styles/login.css"; // ✅ reuse same styles as Login

function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // ✅ Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) navigate("/dashboard");
      } catch {
        // not logged in, continue to signup
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (emailError || passwordError || confirmPasswordError) {
      setErrors({
        email: emailError || "",
        password: passwordError || "",
        confirmPassword: confirmPasswordError || "",
      });
      return;
    }

    setErrors({});
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");

      setSuccess("Signup successful! Redirecting to login...");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      setErrors({ password: err.message });
    }
  };

  return (
    <div className="login-page"> {/* ✅ matches login background */}
      <div className="login-overlay">
        <div className="login-card glass-effect">
          <div className="login-header">
            <img src="/images/logo.png" alt="School Logo" className="login-logo" />
            <h2>Create Account</h2>
            <p className="text-gray">Sign up to get started</p>
          </div>

          <Form onSubmit={handleSubmit}>
            {success && <p className="success-message">{success}</p>}

            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Full Name"
              required
            />

            <Input
              type="email"
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
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  password: validatePassword(e.target.value) || "",
                  confirmPassword:
                    validateConfirmPassword(e.target.value, confirmPassword) || "",
                }));
              }}
              placeholder="Password"
              required
              error={errors.password}
            />

            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword:
                    validateConfirmPassword(password, e.target.value) || "",
                }));
              }}
              placeholder="Confirm Password"
              required
              error={errors.confirmPassword}
            />

            <SubmitButton variant="primary" className="login-btn">
              Sign Up
            </SubmitButton>

            <p className="login-footer">
              Already have an account?{" "}
              <Link to="/login">Log in</Link>
            </p>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
