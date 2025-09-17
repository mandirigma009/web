import type { InputHTMLAttributes } from "react";
import "../styles/Input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;   // optional label
  error?: string;   // optional error message
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input
        {...props}
        className={`input-field ${error ? "error" : ""} ${className}`}
      />
      {error && <p className="input-error">{error}</p>}
    </div>
  );
}
