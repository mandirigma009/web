import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

/**
 * Reusable Button component
 * - Supports primary and secondary styles
 * - Can be extended with any native button props
 */
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "px-4 py-2 rounded font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
  };

  return (
    <button
      {...props}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    />
  );
}

/**
 * SubmitButton – specialized version of Button
 * - Always sets `type="submit"`
 * - Reuses Button styles and props
 */
export function SubmitButton({
  children,
  ...props
}: ButtonProps & { children: React.ReactNode }) {
  return (
    <Button type="submit" {...props}>
      {children}
    </Button>
  );
}
