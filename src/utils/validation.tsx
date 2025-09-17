// util/validation.tsx

export function validateEmail(email: string): string | null {
  if (!email) {
    return "Email is required";
  }

  // Must match xxxx@xxxx.com
  const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;

  if (!emailRegex.test(email)) {
    return "Email must be in format xxxx@xxxx.com";
  }

  return null; // valid
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number";
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least 1 special character";
  }

  return null; // valid
}

// ✅ Confirm password validation
export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (confirmPassword !== password) return "Passwords do not match";
  return null;
}

export function validateLoginPassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number";
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least 1 special character";
  }

  return null; // valid
}
