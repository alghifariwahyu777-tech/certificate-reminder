/** The 38 provinces of Indonesia with the coordinates of their capitals — used to place a project on the map when no exact coordinates are given. */
export const PROVINCES: { name: string; lat: number; lon: number }[] = [
  { name: "Aceh", lat: 5.55, lon: 95.32 },
  { name: "Sumatera Utara", lat: 3.59, lon: 98.67 },
  { name: "Sumatera Barat", lat: -0.95, lon: 100.35 },
  { name: "Riau", lat: 0.51, lon: 101.45 },
  { name: "Kepulauan Riau", lat: 0.92, lon: 104.45 },
  { name: "Jambi", lat: -1.61, lon: 103.61 },
  { name: "Sumatera Selatan", lat: -2.98, lon: 104.75 },
  { name: "Kepulauan Bangka Belitung", lat: -2.13, lon: 106.11 },
  { name: "Bengkulu", lat: -3.8, lon: 102.26 },
  { name: "Lampung", lat: -5.43, lon: 105.26 },
  { name: "DKI Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Banten", lat: -6.12, lon: 106.15 },
  { name: "Jawa Barat", lat: -6.91, lon: 107.61 },
  { name: "Jawa Tengah", lat: -6.97, lon: 110.42 },
  { name: "DI Yogyakarta", lat: -7.8, lon: 110.36 },
  { name: "Jawa Timur", lat: -7.25, lon: 112.75 },
  { name: "Bali", lat: -8.65, lon: 115.22 },
  { name: "Nusa Tenggara Barat", lat: -8.58, lon: 116.12 },
  { name: "Nusa Tenggara Timur", lat: -10.18, lon: 123.61 },
  { name: "Kalimantan Barat", lat: -0.03, lon: 109.33 },
  { name: "Kalimantan Tengah", lat: -2.21, lon: 113.92 },
  { name: "Kalimantan Selatan", lat: -3.44, lon: 114.83 },
  { name: "Kalimantan Timur", lat: -0.5, lon: 117.15 },
  { name: "Kalimantan Utara", lat: 2.84, lon: 117.37 },
  { name: "Sulawesi Utara", lat: 1.47, lon: 124.84 },
  { name: "Gorontalo", lat: 0.54, lon: 123.06 },
  { name: "Sulawesi Tengah", lat: -0.9, lon: 119.87 },
  { name: "Sulawesi Barat", lat: -2.68, lon: 118.89 },
  { name: "Sulawesi Selatan", lat: -5.15, lon: 119.43 },
  { name: "Sulawesi Tenggara", lat: -3.97, lon: 122.51 },
  { name: "Maluku", lat: -3.7, lon: 128.18 },
  { name: "Maluku Utara", lat: 0.79, lon: 127.38 },
  { name: "Papua", lat: -2.53, lon: 140.72 },
  { name: "Papua Barat", lat: -0.86, lon: 134.06 },
  { name: "Papua Barat Daya", lat: -0.88, lon: 131.25 },
  { name: "Papua Tengah", lat: -3.37, lon: 135.5 },
  { name: "Papua Pegunungan", lat: -4.1, lon: 138.95 },
  { name: "Papua Selatan", lat: -8.49, lon: 140.4 },
];

/** Where to draw a project: its own coordinates, otherwise its province capital, otherwise nowhere. */
export function projectPoint(p: { latitude: number | null; longitude: number | null; province: string | null }): { lat: number; lon: number; exact: boolean } | null {
  if (p.latitude !== null && p.longitude !== null) return { lat: p.latitude, lon: p.longitude, exact: true };
  const pr = PROVINCES.find((x) => x.name === p.province);
  return pr ? { lat: pr.lat, lon: pr.lon, exact: false } : null;
}
