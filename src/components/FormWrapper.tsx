// FormWrapper.tsx
// Reusable wrapper for forms (login/signup)

import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function FormWrapper({ title, children }: Props) {
  return (
    <div className="w-8 mx-auto mt-20 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}
