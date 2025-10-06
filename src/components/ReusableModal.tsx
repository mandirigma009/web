import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode; // footer buttons
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  actions,
  size = "md",
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`relative bg-white rounded-lg shadow-lg w-full ${sizeClasses[size]} p-6`}
      >
        {/* Title */}
        {title && (
          <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>
        )}

        {/* Content */}
        <div className="mb-4">{children}</div>

        {/* Footer Actions */}
        {actions && <div className="flex justify-end space-x-2">{actions}</div>}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
