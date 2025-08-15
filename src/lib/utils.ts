import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function copyToClipboard(text: string, onSuccess?: () => void) {
  navigator.clipboard.writeText(text).then(() => {
    onSuccess?.();
  });
}
