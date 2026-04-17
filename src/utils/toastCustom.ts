import { toast } from "sonner";

export const toastCustom = {
  success: (title: string, description?: string) =>
    toast.success(title, {
      description,
      className:
        "bg-green-600 border border-green-500 text-white shadow-lg",
      duration: 3500,
    }),

  error: (title: string, description?: string) =>
    toast.error(title, {
      description,
      className:
        "bg-red-600 border border-red-500 text-white shadow-lg",
      duration: 4500,
    }),

  warning: (title: string, description?: string) =>
    toast.warning(title, {
      description,
      className:
        "bg-orange-500 border border-orange-400 text-white shadow-lg",
      duration: 4000,
      position: "top-center",
    }),

  message: (title: string, description?: string) =>
    toast.message(title, {
      description,
      className:
        "bg-neutral-900 border border-neutral-700 text-white shadow-lg",
      duration: 3500,
    }),
};
