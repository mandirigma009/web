import type { FormHTMLAttributes, ReactNode } from "react";

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Form({ title, description, children, ...props }: FormProps) {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
      {title && (
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {title}
        </h1>
      )}
      {description && (
        <p className="text-center text-gray-500 mb-6">{description}</p>
      )}
      <form {...props} className="space-y-4">
        {children}
      </form>
    </div>
  );
}
