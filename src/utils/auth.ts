// auth.ts
// Helper functions for authentication requests

export async function login(email: string, password: string) {
  const res = await fetch("http://localhost:5173/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error("Invalid credentials");

  const data = await res.json();
  localStorage.setItem("token", data.token); // save JWT
}

export async function signup(email: string, password: string) {
  const res = await fetch("http://localhost:5173/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return await res.json();
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}
