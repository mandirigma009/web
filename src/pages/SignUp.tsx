import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../components/Input";
import { Form } from "../components/Form";
import { SubmitButton } from "../components/Button";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "../utils/validation";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔹 Run all validations
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

      setSuccess("Signup successful! You can now log in.");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrors({ password: err.message });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Form title="Create Account" description="Sign up to get started" onSubmit={handleSubmit}>
            {success && <p className="flex items-center justify-centertext-green-500 text-sm">{success}</p>}
        {/* Name */}
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your Name"
          required
        />

        {/* Email */}
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) || "" }));
          }}
          placeholder="Enter your email"
          required
          error={errors.email}
        />

        {/* Password */}
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({
              ...prev,
              password: validatePassword(e.target.value) || "",
              confirmPassword: validateConfirmPassword(e.target.value, confirmPassword) || "",
            }));
          }}
          placeholder="Enter your password"
          required
          error={errors.password}
        />

        {/* Confirm Password */}
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((prev) => ({
              ...prev,
              confirmPassword: validateConfirmPassword(password, e.target.value) || "",
            }));
          }}
          placeholder="Confirm your password"
          required
          error={errors.confirmPassword}
        />

   

        <SubmitButton variant="primary" className="w-full">
          Sign Up
        </SubmitButton>

        <p className="text-center text-gray-500 text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </Form>
    </div>
  );
}

export default SignUp;
