import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Form } from "../components/Form";
import { SubmitButton } from "../components/Button";
import { validateEmail, validatePassword } from "../utils/validation"

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 const [error, setError] = useState<{
    email?: string;
    
    }>({});

  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [error1, setError1] = useState("");

  // 🔹 Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          navigate("/dashboard");
        } else if (res.status === 401) {
        // User is NOT logged in → stay on login page
        console.log("User not authenticated");
      } else {
        console.error("Unexpected response:", res.status);
      }
        
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError({});
    setError1("Invalid Email or Password");
    setSuccess("");

    // 🔹 Validate inputs before API call
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setError({
        email: emailError || "",
      });
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      setSuccess("Login successful!");
      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <Form title="Login" description="Welcome back" onSubmit={handleSubmit}>
      {error && <p className="flex items-center justify-center input-error">{error1}</p>}
           {success && <p className="flex items-center justify-center text-green-500 text-sm">{success}</p>}

        <Input
          type="email"
          value={email}
                onChange={(e) => {
            setEmail(e.target.value);
            setError((prev) => ({ ...prev, email: validateEmail(e.target.value) || "" }));
          }}
          placeholder="Enter your email"
          required
          error={error.email}
        />
        <Input
          type="password"
          value={password}
         onChange={(e) => {
                    setPassword(e.target.value);
                    setError((prev) => ({
                      ...prev,
                      password: validatePassword(e.target.value) || "",
                    }));
                  }}
                  placeholder="Enter your password"
                  required
                 
        />

        <SubmitButton variant="primary" className="w-full">
          Log In
        </SubmitButton>

        <p className="text-center text-gray-500 text-sm mt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </Form>
    </div>
  );
}

export default Login;
