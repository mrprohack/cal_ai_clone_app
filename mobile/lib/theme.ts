// Design tokens — centralized theme for the Cal AI mobile app
export const Colors = {
  // Backgrounds
  background: "#0D0D0D",
  surface: "#1A1A1A",
  surfaceElevated: "#242424",
  card: "#1E1E1E",

  // Brand
  primary: "#00E5A0",       // Vibrant teal-green
  primaryDark: "#00B37D",
  primaryGlow: "rgba(0,229,160,0.15)",
  accent: "#FF6B35",        // Orange for calories

  // Macros
  protein: "#4FC3F7",       // Blue
  carbs: "#FFD54F",         // Yellow
  fat: "#FF8A65",           // Salmon

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#9E9E9E",
  textMuted: "#616161",

  // Utils
  border: "#2C2C2C",
  success: "#00E5A0",
  warning: "#FFD54F",
  error: "#FF5252",
  overlay: "rgba(0,0,0,0.7)",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};
