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
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const data = await res.json();
          // Everyone goes to /dashboard
          navigate("/dashboard");
        }
      } catch {
        // not logged in, continue to login
      }
    };
    checkAuth();
  }, [navigate]);

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
      if (!res.ok) throw new Error(data.message || "Login failed");

      setSuccess("Login successful! Redirecting...");
      setEmail("");
      setPassword("");

      // Everyone goes to dashboard
      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrors({ password: err.message });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/images/logo.jpg" alt="School Logo" className="login-logo" />
          <h2>Welcome Back</h2>
          <p className="text-gray-500 text-sm">Log in to your account</p>
        </div>

        <Form onSubmit={handleSubmit}>
          {success && <p className="success-message">{success}</p>}

          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) || "" }));
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
              setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) || "" }));
            }}
            placeholder="Password"
            required
            error={errors.password}
          />

          <SubmitButton variant="primary" className="login-btn">Log In</SubmitButton>

          <p className="login-footer">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </Form>
      </div>
    </div>
  );
}

export default Login;
