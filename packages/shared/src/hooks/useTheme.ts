import { useEffect, useState, useCallback } from "react";

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "dark";
  });

  // Setter function to modify the DOM class
  const setTheme = useCallback((nextTheme: "light" | "dark") => {
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Read current class state and observe DOM changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isCurrentlyDark = document.documentElement.classList.contains("dark");
      setThemeState(isCurrentlyDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
  };
}

export default useTheme;
