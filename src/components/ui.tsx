import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";

/** Classes for anything that should look like a button (buttons and links). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50",
    size === "md" && "px-4 py-2.5 text-sm",
    size === "lg" && "px-5 py-3 text-base",
    variant === "primary" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
    variant === "secondary" &&
      "border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50",
    variant === "ghost" && "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
    className,
  );
}

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

/** A link styled as a button. (A <button> inside an <a> is invalid HTML.) */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand-600 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-zinc-700", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand-600 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
