import type { Preview } from "@storybook/react-vite";
import { LocaleDecorator, ThemeDecorator } from "./decorators";
import "./preview.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: "Language",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "pl", title: "Polski" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", locale: "en" },
  decorators: [ThemeDecorator, LocaleDecorator],
  parameters: {
    layout: "padded",
    controls: { expanded: true, matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "todo" },
  },
  tags: ["autodocs"],
};

export default preview;
