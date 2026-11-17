"use client";

/** Submit button that asks for confirmation before submitting its form. */
export function ConfirmButton({ message, children, className = "btn-danger" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
