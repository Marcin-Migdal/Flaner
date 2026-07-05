import React from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@flaner-v2/shared";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:font-sans border",
          description: "group-[.toast]:text-muted-foreground text-xs mt-1",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:text-emerald-600 dark:group-[.toast]:text-emerald-400",
          error: "group-[.toast]:text-destructive",
          warning: "group-[.toast]:text-amber-600 dark:group-[.toast]:text-amber-400",
          info: "group-[.toast]:text-brand",
        },
      }}
      {...props}
    />
  );
}

export default Toaster;
