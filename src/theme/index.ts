/**
 * Bloat design tokens.
 *
 * Direction: calm, warm, premium — closer to a nutrition-brand editorial
 * feel than a clinical health-tech dashboard. No hospital blues, no
 * meditation-app gradients, no "health tech green."
 */

export const colors = {
  // Neutrals — warm off-whites and soft charcoal instead of stark white/black.
  background: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceMuted: "#F2EDE4",
  border: "#E7E0D4",

  textPrimary: "#241F1A",
  textSecondary: "#6B6255",
  textTertiary: "#9C927F",

  // Single warm accent — used sparingly for primary actions.
  accent: "#C1663D",
  accentMuted: "#EADBCF",

  // Status — muted, not saturated "health app" colors.
  success: "#4C7A5E",
  successMuted: "#DEEBE2",
  warning: "#B3873B",
  warningMuted: "#F3E7D2",
  danger: "#B5493F",
  dangerMuted: "#F5DEDB",

  // Severity scale 0-5, low to high — warm neutral to accent, never
  // traffic-light red/green so it doesn't read as "good vs bad food."
  severity: ["#E7E0D4", "#DCC9B4", "#D2B294", "#C79A74", "#BD8354", "#B36B34"],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "600" as const, lineHeight: 38 },
  title: { fontSize: 24, fontWeight: "600" as const, lineHeight: 30 },
  headline: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
};

export const theme = { colors, spacing, radius, typography };
export type Theme = typeof theme;
