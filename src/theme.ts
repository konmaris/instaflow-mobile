// Shared design tokens for the rider/waiter app.
export const colors = {
  bg: "#f4f5f7",
  card: "#ffffff",
  ink: "#0f172a",
  inkSoft: "#475569",
  muted: "#94a3b8",
  line: "#e7e9ee",
  brand: "#111111",
  accent: "#ff5722",
  accentSoft: "#fff1ec",
  green: "#16a34a",
  greenSoft: "#e9f7ee",
  amber: "#d97706",
  amberSoft: "#fef3e2",
  red: "#dc2626",
  redSoft: "#fdeaea",
  blue: "#2563eb",
  blueSoft: "#e8efff",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const shadow = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

// Per-status accent colours for order badges.
export const statusStyle: Record<string, { fg: string; bg: string; label: string }> = {
  pending: { fg: colors.amber, bg: colors.amberSoft, label: "Pending" },
  accepted: { fg: colors.blue, bg: colors.blueSoft, label: "Accepted" },
  preparing: { fg: colors.blue, bg: colors.blueSoft, label: "Preparing" },
  ready: { fg: colors.accent, bg: colors.accentSoft, label: "Ready" },
  assigned: { fg: colors.blue, bg: colors.blueSoft, label: "Assigned" },
  out_for_delivery: { fg: colors.accent, bg: colors.accentSoft, label: "On the way" },
  delivered: { fg: colors.green, bg: colors.greenSoft, label: "Delivered" },
  served: { fg: colors.green, bg: colors.greenSoft, label: "Served" },
  completed: { fg: colors.green, bg: colors.greenSoft, label: "Completed" },
  cancelled: { fg: colors.red, bg: colors.redSoft, label: "Cancelled" },
  rejected: { fg: colors.red, bg: colors.redSoft, label: "Rejected" },
};
