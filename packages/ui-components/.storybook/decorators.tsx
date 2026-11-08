import type { Decorator } from "@storybook/react-vite";
import { useEffect } from "react";
import i18n from "./i18n";

type Theme = "light" | "dark";

const isTheme = (value: string): value is Theme => value === "light" || value === "dark";

/** Toggles the `.dark` class the app uses, so every story renders with the real theme tokens. */
export const ThemeDecorator: Decorator = (Story, context) => {
  const theme: Theme = typeof context.globals.theme === "string" && isTheme(context.globals.theme) ? context.globals.theme : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <Story />;
};

export const LocaleDecorator: Decorator = (Story, context) => {
  const locale = typeof context.globals.locale === "string" ? context.globals.locale : "en";

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  return <Story />;
};
