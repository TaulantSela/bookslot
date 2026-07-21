import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number | null | undefined) {
  if (cents == null || cents === 0) return null;
  return `${(cents / 100).toFixed(0)} MKD`;
}
