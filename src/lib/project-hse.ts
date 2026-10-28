/**
 * HSE (K3) figures from monthly project records. Rates use the 1.000.000
 * work-hour basis common in Indonesian K3 reporting:
 *  - LTIFR (Lost Time Injury Frequency Rate) = LTI × 1.000.000 / jam kerja
 *  - TRIR (Total Recordable Incident Rate)  = (fatality + LTI + medical treatment) × 1.000.000 / jam kerja
 */
export type HseRecord = {
  periodDate: number;
  manHours: number;
  nearMiss: number;
  firstAid: number;
  medicalTreatment: number;
  lostTimeInjury: number;
  fatality: number;
  propertyDamage: number;
  unsafeObservations: number;
  safetyTalks: number;
  inspections: number;
};

export type HseSummary = {
  months: number;
  manHours: number;
  fatality: number;
  lostTimeInjury: number;
  medicalTreatment: number;
  firstAid: number;
  nearMiss: number;
  propertyDamage: number;
  unsafeObservations: number;
  safetyTalks: number;
  inspections: number;
  recordable: number;
  ltifr: number | null;
  trir: number | null;
  /** work hours since the last month with a lost-time injury or fatality (all hours when there has been none) */
  safeHours: number;
  lastLtiMonth: number | null;
  lastPeriod: number | null;
  /** "good": no recordable incident; "warn": medical treatment / property damage; "bad": LTI or fatality */
  signal: "good" | "warn" | "bad" | "none";
};

const rate = (n: number, hours: number) => (hours > 0 ? Math.round(((n * 1_000_000) / hours) * 100) / 100 : null);

export function summarizeHse(records: HseRecord[]): HseSummary {
  const sorted = [...records].sort((a, b) => a.periodDate - b.periodDate);
  const sum = (k: keyof HseRecord) => sorted.reduce((s, r) => s + (r[k] as number), 0);
  const manHours = sum("manHours");
  const fatality = sum("fatality");
  const lostTimeInjury = sum("lostTimeInjury");
  const medicalTreatment = sum("medicalTreatment");
  const recordable = fatality + lostTimeInjury + medicalTreatment;
  const lastLti = [...sorted].reverse().find((r) => r.lostTimeInjury > 0 || r.fatality > 0);
  const safeHours = sorted.filter((r) => !lastLti || r.periodDate > lastLti.periodDate).reduce((s, r) => s + r.manHours, 0);
  const propertyDamage = sum("propertyDamage");
  return {
    months: sorted.length,
    manHours,
    fatality,
    lostTimeInjury,
    medicalTreatment,
    firstAid: sum("firstAid"),
    nearMiss: sum("nearMiss"),
    propertyDamage,
    unsafeObservations: sum("unsafeObservations"),
    safetyTalks: sum("safetyTalks"),
    inspections: sum("inspections"),
    recordable,
    ltifr: rate(lostTimeInjury + fatality, manHours),
    trir: rate(recordable, manHours),
    safeHours,
    lastLtiMonth: lastLti ? lastLti.periodDate : null,
    lastPeriod: sorted.length ? sorted[sorted.length - 1].periodDate : null,
    signal: !sorted.length ? "none" : fatality + lostTimeInjury > 0 ? "bad" : medicalTreatment + propertyDamage > 0 ? "warn" : "good",
  };
}

/**
 * Severity ladder, most severe first. Colours run from deep maroon (fatal)
 * through red, orange and amber (minor injuries and near misses) to a calm
 * steel blue for unsafe acts/conditions, which are reports, not injuries.
 */
export const HSE_LEVELS: { key: keyof HseRecord; label: string; short: string; color: string; tint: string; group: "lagging" | "leading" }[] = [
  { key: "fatality", label: "Fatal", short: "Fatal", color: "#5B1414", tint: "#F3E4E4", group: "lagging" },
  { key: "lostTimeInjury", label: "Cedera hilang hari kerja (LTI)", short: "LTI", color: "#B42318", tint: "#FBE7E5", group: "lagging" },
  { key: "medicalTreatment", label: "Perawatan medis", short: "Medis", color: "#E0592A", tint: "#FDEDE6", group: "lagging" },
  { key: "firstAid", label: "P3K (pertolongan pertama)", short: "P3K", color: "#F08C2E", tint: "#FEF1E4", group: "leading" },
  { key: "nearMiss", label: "Nyaris celaka", short: "Nyaris", color: "#E9B21F", tint: "#FDF6DF", group: "leading" },
  { key: "unsafeObservations", label: "Tindakan / kondisi tidak aman", short: "Temuan", color: "#5F7F9E", tint: "#E9EFF5", group: "leading" },
];

export const toHseRecord = (r: { periodDate: Date } & Omit<HseRecord, "periodDate">): HseRecord => ({
  periodDate: r.periodDate.getTime(),
  manHours: r.manHours,
  nearMiss: r.nearMiss,
  firstAid: r.firstAid,
  medicalTreatment: r.medicalTreatment,
  lostTimeInjury: r.lostTimeInjury,
  fatality: r.fatality,
  propertyDamage: r.propertyDamage,
  unsafeObservations: r.unsafeObservations,
  safetyTalks: r.safetyTalks,
  inspections: r.inspections,
});
