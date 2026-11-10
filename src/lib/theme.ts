// Widget theming. Every value here ends up inside a <style> tag, so inputs
// from host sites are parsed into a closed set of safe shapes (hex colors,
// bounded integers, named presets). Nothing a host sends is ever echoed raw.

export type ColorScheme = "light" | "dark" | "auto";
export type FontPreset = "sans" | "system" | "serif" | "mono";

export type ThemeOverrides = {
  primary?: string;
  background?: string;
  text?: string;
  radius?: number;
  font?: FontPreset;
  scheme?: ColorScheme;
};

type Palette = {
  bg: string;
  surface: string;
  input: string;
  text: string;
  muted: string;
  border: string;
};

const LIGHT: Palette = {
  bg: "#ffffff",
  surface: "#ffffff",
  input: "#ffffff",
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
};

const DARK: Palette = {
  bg: "#18181b",
  surface: "#27272a",
  input: "#27272a",
  text: "#fafafa",
  muted: "#a1a1aa",
  border: "#3f3f46",
};

const FONT_STACKS: Record<FontPreset, string> = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  system:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
};

export const DEFAULT_RADIUS = 12;
const MAX_RADIUS = 32;

/** Accepts "#abc", "abc", "#aabbcc" or "aabbcc"; returns lowercase "#aabbcc" or null. */
export function parseHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1].toLowerCase();
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  return `#${full}`;
}

export function parseRadius(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  return Math.min(Number(text), MAX_RADIUS);
}

export function parseFont(value: unknown): FontPreset | null {
  // Own keys only: `in` would also accept inherited names like "toString".
  return typeof value === "string" && Object.hasOwn(FONT_STACKS, value)
    ? (value as FontPreset)
    : null;
}

export function parseScheme(value: unknown): ColorScheme | null {
  return value === "light" || value === "dark" || value === "auto" ? value : null;
}

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads theme overrides from embed URL parameters, dropping anything invalid. */
export function parseThemeParams(params: Params): ThemeOverrides {
  const overrides: ThemeOverrides = {};
  const primary = parseHexColor(first(params.primary));
  const background = parseHexColor(first(params.background));
  const text = parseHexColor(first(params.text));
  const radius = parseRadius(first(params.radius));
  const font = parseFont(first(params.font));
  const scheme = parseScheme(first(params.scheme));

  if (primary) overrides.primary = primary;
  if (background) overrides.background = background;
  if (text) overrides.text = text;
  if (radius !== null) overrides.radius = radius;
  if (font) overrides.font = font;
  if (scheme) overrides.scheme = scheme;
  return overrides;
}

/** Black or white, whichever reads better on the given background color. */
export function contrastText(hex: string) {
  const value = parseHexColor(hex) ?? "#000000";
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(value.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#18181b" : "#ffffff";
}

function declarations(
  palette: Palette,
  primary: string,
  overrides: ThemeOverrides,
) {
  const bg = overrides.background ?? palette.bg;
  const vars: Record<string, string> = {
    "--bs-primary": primary,
    "--bs-primary-text": contrastText(primary),
    "--bs-bg": bg,
    "--bs-surface": overrides.background ?? palette.surface,
    "--bs-input": overrides.background ?? palette.input,
    "--bs-text": overrides.text ?? palette.text,
    "--bs-muted": palette.muted,
    "--bs-border": palette.border,
    "--bs-radius": `${overrides.radius ?? DEFAULT_RADIUS}px`,
    "--bs-font": FONT_STACKS[overrides.font ?? "sans"],
  };
  return Object.entries(vars)
    .map(([name, value]) => `${name}:${value};`)
    .join("");
}

/**
 * CSS custom properties for the widget. `selector` scopes them: ":root" in
 * the embed (the iframe document is only the widget), ".bookslot" on pages
 * that host the widget among other content.
 */
export function buildThemeCss({
  shopPrimary,
  overrides = {},
  selector,
  paintBody = false,
}: {
  shopPrimary: string;
  overrides?: ThemeOverrides;
  selector: ":root" | ".bookslot";
  paintBody?: boolean;
}) {
  const primary = overrides.primary ?? parseHexColor(shopPrimary) ?? "#2563eb";
  const scheme = overrides.scheme ?? "light";
  const light = declarations(LIGHT, primary, overrides);
  const dark = declarations(DARK, primary, overrides);

  let css =
    scheme === "dark"
      ? `${selector}{${dark}color-scheme:dark;}`
      : `${selector}{${light}color-scheme:light;}`;
  if (scheme === "auto") {
    css += `@media (prefers-color-scheme: dark){${selector}{${dark}color-scheme:dark;}}`;
  }
  if (paintBody) {
    css += "html,body{background:var(--bs-bg);min-height:0;}";
  }
  return css;
}
