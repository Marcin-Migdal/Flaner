import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Design tokens from `src/theme/theme.css` (spec: `.agents/docs/design-system.md`).
 * Switch the theme in the toolbar to see the dark values.
 */
const meta = {
  title: "Foundations/Tokens",
  parameters: { layout: "padded" },
  tags: ["!autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Swatch = { name: string; className: string };

/** Re-renders when the `.dark` class on <html> changes, so computed values stay current. */
function useThemeKey() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark ? "dark" : "light";
}

function ColorSwatch({ name, className }: Swatch) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeKey();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).backgroundColor);
  }, [theme]);

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={ref} className={`h-14 rounded-xl border border-border ${className}`} />
      <code className="text-2xs font-semibold text-foreground">{name}</code>
      <code className="truncate text-3xs text-muted-foreground" title={value}>
        {value}
      </code>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {swatches.map((swatch) => (
        <ColorSwatch key={swatch.name} {...swatch} />
      ))}
    </div>
  );
}

const SURFACES: Swatch[] = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "popover", className: "bg-popover" },
  { name: "surface-subtle", className: "bg-surface-subtle" },
  { name: "surface-raised", className: "bg-surface-raised" },
  { name: "surface-hover", className: "bg-surface-hover" },
  { name: "surface-strong", className: "bg-surface-strong" },
  { name: "surface-inverse", className: "bg-surface-inverse" },
  { name: "muted", className: "bg-muted" },
  { name: "muted-foreground", className: "bg-muted-foreground" },
  { name: "secondary", className: "bg-secondary" },
  { name: "primary", className: "bg-primary" },
  { name: "border", className: "bg-border" },
  { name: "border-subtle", className: "bg-border-subtle" },
  { name: "input", className: "bg-input" },
  { name: "input-border", className: "bg-input-border" },
  { name: "ring", className: "bg-ring" },
];

const BRAND: Swatch[] = [
  { name: "brand", className: "bg-brand" },
  { name: "brand-dark", className: "bg-brand-dark" },
  { name: "brand-foreground", className: "bg-brand-foreground" },
  { name: "brand-text", className: "bg-brand-text" },
  { name: "brand-subtle", className: "bg-brand-subtle" },
];

const STATUS: Swatch[] = [
  { name: "success", className: "bg-success" },
  { name: "success-subtle", className: "bg-success-subtle" },
  { name: "warning", className: "bg-warning" },
  { name: "warning-subtle", className: "bg-warning-subtle" },
  { name: "danger", className: "bg-danger" },
  { name: "danger-subtle", className: "bg-danger-subtle" },
  { name: "info", className: "bg-info" },
  { name: "info-subtle", className: "bg-info-subtle" },
];

const CHARTS: Swatch[] = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
  { name: "chart-6", className: "bg-chart-6" },
  { name: "chart-7", className: "bg-chart-7" },
  { name: "chart-8", className: "bg-chart-8" },
  { name: "chart-positive", className: "bg-chart-positive" },
  { name: "chart-negative", className: "bg-chart-negative" },
];

const DOMAIN: Swatch[] = [
  { name: "vote-yes", className: "bg-vote-yes" },
  { name: "vote-maybe", className: "bg-vote-maybe" },
  { name: "vote-no", className: "bg-vote-no" },
  { name: "medal-gold", className: "bg-medal-gold" },
  { name: "medal-silver", className: "bg-medal-silver" },
  { name: "medal-bronze", className: "bg-medal-bronze" },
];

const EVENT_KEYS = ["blue", "indigo", "violet", "purple", "fuchsia", "pink", "cyan", "sky", "teal", "slate"];

function EventSwatch({ eventKey }: { eventKey: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-14 rounded-xl border border-border" style={{ backgroundColor: `var(--event-${eventKey})` }} />
      <code className="text-2xs font-semibold text-foreground">{eventKey}</code>
    </div>
  );
}

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="Surfaces & text" description="shadcn roles plus Flaner surfaces. Use surface-raised for rows inside a surface-subtle section.">
        <SwatchGrid swatches={SURFACES} />
      </Section>
      <Section title="Brand" description="brand = fills, brand-text = brand-coloured text and icons (AA in both themes), brand-foreground = text on brand.">
        <SwatchGrid swatches={BRAND} />
      </Section>
      <Section title="Status" description="Solid fill + *-foreground for text on it; *-text for text on surfaces; *-subtle for tints.">
        <SwatchGrid swatches={STATUS} />
      </Section>
      <Section title="Data visualisation" description="Categorical palette, ≥ 3:1 against the background in both themes. D3 reads var(--chart-N).">
        <SwatchGrid swatches={CHARTS} />
      </Section>
      <Section title="Domain" description="Aliases or domain colours; vote-* = success / warning / danger.">
        <SwatchGrid swatches={DOMAIN} />
      </Section>
      <Section title="Event slot colours" description="Firestore stores the key; --event-<key> has a light and a dark value.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {EVENT_KEYS.map((eventKey) => (
            <EventSwatch key={eventKey} eventKey={eventKey} />
          ))}
        </div>
      </Section>
    </div>
  ),
};

const TYPE_SCALE = [
  { name: "text-5xs · 8px", className: "text-5xs", note: "dense calendar grid only" },
  { name: "text-4xs · 9px", className: "text-4xs", note: "dense grids, micro badges" },
  { name: "text-3xs · 10px", className: "text-3xs", note: "counters, calendar labels" },
  { name: "text-2xs · 11px", className: "text-2xs", note: "meta, captions, eyebrows" },
  { name: "text-xs · 12px", className: "text-xs", note: "helper text" },
  { name: "text-sm · 14px", className: "text-sm", note: "default UI body" },
  { name: "text-base · 16px", className: "text-base", note: "long-form body" },
  { name: "text-lg · 18px", className: "text-lg", note: "section titles" },
  { name: "text-xl · 20px", className: "text-xl", note: "sheet / dialog titles" },
  { name: "text-2xl · 24px", className: "text-2xl", note: "page title (mobile)" },
  { name: "text-3xl · 30px", className: "text-3xl", note: "page title (desktop)" },
];

export const Typography: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Section title="Type scale" description="Geist Variable. Weights: 400 / 500 / 600 / 700; 800–900 only for page titles.">
        <div className="flex flex-col divide-y divide-border-subtle">
          {TYPE_SCALE.map((step) => (
            <div key={step.name} className="grid grid-cols-[10rem_1fr] items-baseline gap-4 py-2 sm:grid-cols-[10rem_1fr_14rem]">
              <code className="text-2xs text-muted-foreground">{step.name}</code>
              <span className={`${step.className} text-foreground`}>Plan the weekend together</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{step.note}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Page title">
        <span className="font-heading text-2xl font-black tracking-tight text-foreground sm:text-3xl">Groups</span>
      </Section>
    </div>
  ),
};

const RADII = ["rounded-xs", "rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-3xl", "rounded-full"];
const SHADOWS = ["shadow-raised", "shadow-overlay", "shadow-modal", "shadow-edge", "shadow-drawer", "shadow-glow-brand", "shadow-glow-warning", "shadow-glow-danger"];

export const ShapeAndElevation: Story = {
  name: "Radius & elevation",
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="Radius" description="Inputs & buttons rounded-lg, cards rounded-2xl, sheets & modals rounded-3xl, pills & avatars rounded-full.">
        <div className="flex flex-wrap gap-4">
          {RADII.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-1.5">
              <div className={`size-16 border border-border bg-surface-subtle ${radius}`} />
              <code className="text-2xs text-muted-foreground">{radius}</code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Elevation">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {SHADOWS.map((shadow) => (
            <div key={shadow} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-full rounded-2xl bg-card ${shadow}`} />
              <code className="text-2xs text-muted-foreground">{shadow}</code>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
};

const MOTION = [
  { token: "duration-150", use: "hover, toggles", className: "duration-150" },
  { token: "duration-200", use: "popovers, tabs", className: "duration-200" },
  { token: "duration-300", use: "sheets, modals", className: "duration-300" },
];

const BREAKPOINTS = [
  { token: "xs", value: "360px" },
  { token: "sm", value: "640px" },
  { token: "md", value: "768px" },
  { token: "lg", value: "1024px" },
  { token: "desktop", value: "1080px" },
  { token: "split", value: "1200px" },
  { token: "calendar", value: "1284px" },
  { token: "wide", value: "1440px" },
];

export const MotionAndLayout: Story = {
  name: "Motion & breakpoints",
  render: () => (
    <div className="flex flex-col gap-10">
      <Section title="Motion" description="Hover a row. Easing: ease-standard / ease-emphasized. prefers-reduced-motion disables animation globally.">
        <div className="flex flex-col gap-3">
          {MOTION.map((step) => (
            <div key={step.token} className="group flex items-center gap-4">
              <code className="w-28 text-2xs text-muted-foreground">{step.token}</code>
              <div className="h-8 flex-1 rounded-lg bg-surface-subtle">
                <div className={`h-8 w-8 rounded-lg bg-brand transition-transform ease-standard group-hover:translate-x-48 ${step.className}`} />
              </div>
              <span className="w-32 text-xs text-muted-foreground">{step.use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Breakpoints" description="Mobile-first; use the names, never min-[Npx]:.">
        <div className="grid max-w-sm grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {BREAKPOINTS.map((breakpoint) => (
            <div key={breakpoint.token} className="contents">
              <code className="text-foreground">{breakpoint.token}:</code>
              <span className="text-muted-foreground">{breakpoint.value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
};
