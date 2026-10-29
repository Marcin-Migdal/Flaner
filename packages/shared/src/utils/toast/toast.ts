import { toast as sonnerToast } from "sonner";

export type ToastOptions = {
  description?: string;
  duration?: number;
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
    });
  },
};

export default toast;
