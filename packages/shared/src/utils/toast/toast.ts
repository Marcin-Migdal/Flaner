import type { ReactElement } from "react";
import { toast as sonnerToast } from "sonner";

export type ToastOptions = {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration,
    });
  },
  failure: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration,
    });
  },
  attention: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration,
    });
  },
  message: (message: string, options?: ToastOptions) => {
    sonnerToast(message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  },
  /** Fully custom content (e.g. a clickable card); the same `id` replaces instead of stacking a duplicate. */
  custom: (render: (id: string | number) => ReactElement, options?: { id?: string; duration?: number }) => {
    sonnerToast.custom(render, { id: options?.id, duration: options?.duration });
  },
  dismiss: (id: string | number) => {
    sonnerToast.dismiss(id);
  },
};

export default toast;
