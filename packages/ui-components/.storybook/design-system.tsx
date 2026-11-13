/**
 * Bundle entry for the "Flaner" Design System artifact in Claude (#62), built by `npm run design:export`
 * into one IIFE on `window.Flaner`: every `@flaner/ui-components` export (so Claude Design can build with
 * the real components) plus the Storybook stories composed for the per-component preview cards.
 */
/* eslint-disable react-refresh/only-export-components -- a bundle entry, never hot-reloaded */
import { composeStories } from "@storybook/react-vite";
import { icons, type LucideProps } from "lucide-react";
import { type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./design-system.css";

type StoryModule = Parameters<typeof composeStories>[0];

const modules = import.meta.glob<StoryModule>("../src/**/*.stories.tsx", { eager: true });

/** "Primitives/DropdownMenu" → "DropdownMenu", "Patterns/Page shell" → "PageShell". */
const cardName = (title: string) =>
  (title.split("/").pop() ?? title)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

export const stories: Record<string, Record<string, ComponentType>> = {};
for (const module of Object.values(modules)) {
  const title = module.default.title;
  if (title) stories[cardName(title)] = composeStories(module);
}

/** Renders every story of one card, each under its name — the body of `components/<Name>/preview.html`. */
export function renderStories(element: HTMLElement, name: string) {
  const entries = Object.entries(stories[name] ?? {});
  createRoot(element).render(
    <div className="flex flex-col gap-6 p-4">
      {entries.map(([storyName, Story]) => (
        <section key={storyName} className="flex flex-col gap-2">
          <p className="text-2xs font-medium text-muted-foreground">{storyName}</p>
          {/* Block wrapper, as in Storybook's canvas: inline components keep their own width */}
          <div>
            <Story />
          </div>
        </section>
      ))}
    </div>,
  );
}

/** Any lucide icon by name (`<x-import component-from-global-scope="Flaner.Icon" name="Users">`) — the app's only icon set. */
const isIconName = (name: string): name is keyof typeof icons => name in icons;

export function Icon({ name, ...props }: LucideProps & { name: string }) {
  if (!isIconName(name)) return null;
  const Glyph = icons[name];
  return <Glyph aria-hidden="true" {...props} />;
}

// The app themes with a `.dark` class; the Design System page sets `data-theme` on <html>.
const syncTheme = () => document.documentElement.classList.toggle("dark", document.documentElement.dataset.theme === "dark");
syncTheme();
new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// Re-export the whole library onto window.Flaner.
export * from "../src";
