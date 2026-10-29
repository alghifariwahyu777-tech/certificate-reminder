/**
 * One palette for every chart in the Project module, so colours mean the same
 * thing everywhere:
 *  - status: green = sesuai rencana, amber = waspada, red = kritis
 *  - blue = realisasi / nilai yang dicapai, grey dashed = rencana, navy = target / saldo
 *  - money: green = kas masuk, red = kas keluar
 * HSE severity has its own red→amber ramp (see project-hse.ts).
 */
export const CHART = {
  navy: "#123F6B",
  blue: "#1671B8",
  blueSoft: "#8BB8DE",
  plan: "#94A3B8",
  good: "#2F855A",
  goodSoft: "#5BAA7E",
  warn: "#D69E2E",
  bad: "#C2362F",
  badSoft: "#E06A63",
  hse: "#0E7490",
  neutral: "#CBD5E1",
  grid: "#E6EBF1",
  axis: "#64748B",
} as const;
