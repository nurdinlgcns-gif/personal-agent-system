import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ActionButtonTone = "blue" | "green" | "red" | "purple" | "ghost";

export function ActionButton({
  children,
  tone = "blue",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: ActionButtonTone;
}) {
  return (
    <button type="button" className={`ui-button ${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}