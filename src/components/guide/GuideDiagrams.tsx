/**
 * Illustrations for the Panduan page. Drawn in code (not screenshots) so they
 * stay sharp, follow light and dark mode, and never go out of date when the
 * screens change. Colours follow the chart palette: blue = realisasi,
 * grey dashed = rencana, green / amber / red = baik / waspada / kritis.
 */

const C = { plan: "#94A3B8", actual: "#1671B8", navy: "#123F6B", good: "#2F855A", warn: "#D69E2E", bad: "#C2362F", grid: "#E6EBF1", axis: "#64748B" };

function Figure({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="my-3 rounded-lg border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      {children}
      <figcaption className="mt-2 text-[12px] text-slate-500">{caption}</figcaption>
    </figure>
  );
}

const svgText = "fill-slate-600 dark:fill-slate-300";
const svgStrong = "fill-ink dark:fill-slate-100";

// ---------------------------------------------------------------------------
// Alur project per bagian
// ---------------------------------------------------------------------------

const ROLE_STYLE: Record<string, string> = {
  PM: "bg-[#E8F1FA] text-[#123F6B] border-[#C9DDF0]",
  Keuangan: "bg-[#EAF5EE] text-[#2F855A] border-[#C6E6D2]",
  QHSE: "bg-[#FBF3E4] text-[#9A6412] border-[#F0DDB5]",
  HC: "bg-[#F3EEFA] text-[#5B3E8A] border-[#DDD0EF]",
  Manajemen: "bg-slate-100 text-slate-700 border-slate-200",
  PIC: "bg-[#E8F1FA] text-[#123F6B] border-[#C9DDF0]",
};

export function RoleChip({ role }: { role: string }) {
  return <span className={`inline-block rounded border px-1.5 py-px text-[11px] font-semibold ${ROLE_STYLE[role] ?? ROLE_STYLE.Manajemen}`}>{role}</span>;
}

export function FlowDiagram() {
  const phases: { title: string; when: string; steps: [string[], string][] }[] = [
    {
      title: "1. Persiapan",
      when: "Minggu pertama",
      steps: [
        [["PM"], "Buat project, unggah RAB"],
        [["PM"], "Isi milestone dan jadwal"],
        [["HC"], "Tugaskan personil"],
        [["Keuangan"], "Isi termin pembayaran"],
      ],
    },
    {
      title: "2. Pelaksanaan",
      when: "Selama project berjalan",
      steps: [
        [["PM"], "Perbarui realisasi kegiatan (boleh harian)"],
        [["PM", "Keuangan"], "Catat biaya dan penyebabnya"],
        [["PM", "QHSE"], "Catat kendala dan risiko"],
        [["QHSE"], "Laporan HSE tiap bulan"],
        [["Keuangan"], "Invoice dan pembayaran"],
      ],
    },
    {
      title: "3. Penutupan",
      when: "Saat pekerjaan selesai",
      steps: [
        [["PM"], "Ubah status ke Selesai"],
        [["PM"], "Lengkapi BAPP, BAST, laporan akhir"],
        [["Keuangan"], "Tagih dan terima termin terakhir"],
      ],
    },
  ];
  return (
    <Figure caption="Alur project dan bagian yang mengisi setiap langkah. Sepanjang project, Manajemen memantau melalui Monitoring Project dan laporan mingguan.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {phases.map((p, i) => (
          <div key={p.title} className="relative rounded-lg border border-line bg-paper/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-[13px] font-bold text-ink dark:text-slate-100">{p.title}</p>
            <p className="mb-2 text-[11.5px] text-slate-500">{p.when}</p>
            <ul className="space-y-2.5">
              {p.steps.map(([roles, text]) => (
                <li key={text} className="text-[12.5px] text-slate-700 dark:text-slate-200">
                  <span className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                      <RoleChip key={r} role={r} />
                    ))}
                  </span>
                  <span className="mt-0.5 block">{text}</span>
                </li>
              ))}
            </ul>
            {i < phases.length - 1 && (
              <span aria-hidden className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-[13px] text-slate-500 md:flex dark:border-slate-700 dark:bg-slate-900">
                ›
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <RoleChip role="Manajemen" />
        <span>Memantau angka utama, project kritis, dan laporan mingguan, lalu mengambil keputusan.</span>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Kurva S
// ---------------------------------------------------------------------------

export function SCurveDiagram() {
  // plan: smooth S from (40,190) to (480,30); actual: lower, up to "today" at x = 300
  const plan = "M40 190 C 150 190, 170 40, 480 30";
  const actual = "M40 190 C 130 189, 170 120, 300 112";
  return (
    <Figure caption="Kurva S membandingkan progres kumulatif rencana (abu-abu putus-putus) dan realisasi (biru). Selisih tegak pada hari ini adalah deviasi.">
      <svg viewBox="0 0 520 230" className="h-auto w-full max-w-[560px]" role="img" aria-label="Contoh kurva S">
        {[0, 25, 50, 75, 100].map((v) => {
          const y = 190 - v * 1.6;
          return (
            <g key={v}>
              <line x1={40} x2={490} y1={y} y2={y} stroke={C.grid} />
              <text x={32} y={y + 4} textAnchor="end" fontSize={11} className={svgText}>
                {v}%
              </text>
            </g>
          );
        })}
        <path d={plan} fill="none" stroke={C.plan} strokeWidth={2.5} strokeDasharray="6 5" />
        <path d={actual} fill="none" stroke={C.actual} strokeWidth={3} />
        <line x1={300} x2={300} y1={20} y2={196} stroke={C.actual} strokeDasharray="3 3" />
        <text x={300} y={212} textAnchor="middle" fontSize={11} className={svgText}>
          Hari ini
        </text>
        {/* deviation bracket: plan at today ≈ y 66, actual = 112 */}
        <line x1={312} x2={312} y1={68} y2={110} stroke={C.bad} strokeWidth={2} />
        <line x1={306} x2={318} y1={68} y2={68} stroke={C.bad} strokeWidth={2} />
        <line x1={306} x2={318} y1={110} y2={110} stroke={C.bad} strokeWidth={2} />
        <text x={324} y={88} fontSize={12} fontWeight={700} fill={C.bad}>
          Deviasi −29 poin
        </text>
        <text x={324} y={103} fontSize={11} className={svgText}>
          rencana 78%, realisasi 49%
        </text>
        <text x={440} y={26} fontSize={12} fontWeight={600} className={svgStrong}>
          Rencana
        </text>
        <text x={200} y={140} fontSize={12} fontWeight={600} fill={C.actual}>
          Realisasi
        </text>
        <text x={40} y={212} fontSize={11} className={svgText}>
          Mulai
        </text>
        <text x={490} y={212} textAnchor="end" fontSize={11} className={svgText}>
          Target selesai
        </text>
      </svg>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Matriks waktu dan biaya
// ---------------------------------------------------------------------------

export function MatrixDiagram() {
  const q = [
    { x: 40, y: 10, fill: "#FBF3E4", label: "Terlambat", sub: "biaya hemat", color: C.warn },
    { x: 200, y: 10, fill: "#EAF5EE", label: "Sesuai rencana", sub: "tepat waktu, hemat", color: C.good },
    { x: 40, y: 150, fill: "#FBEDEC", label: "Terlambat dan boros", sub: "paling perlu perhatian", color: C.bad },
    { x: 200, y: 150, fill: "#FBF3E4", label: "Boros", sub: "tepat waktu", color: C.warn },
  ];
  return (
    <Figure caption="Setiap titik satu project. Ke kanan berarti makin tepat waktu, ke atas berarti makin hemat. Garis tengah adalah nilai 1 (sesuai rencana).">
      <svg viewBox="0 0 380 330" className="h-auto w-full max-w-[400px]" role="img" aria-label="Contoh matriks waktu dan biaya">
        {q.map((r) => (
          <g key={r.label}>
            <rect x={r.x} y={r.y} width={160} height={140} fill={r.fill} />
            <text x={r.x + 80} y={r.y + 62} textAnchor="middle" fontSize={13} fontWeight={700} fill={r.color}>
              {r.label}
            </text>
            <text x={r.x + 80} y={r.y + 80} textAnchor="middle" fontSize={11} className={svgText}>
              {r.sub}
            </text>
          </g>
        ))}
        <line x1={200} x2={200} y1={10} y2={290} stroke={C.axis} />
        <line x1={40} x2={360} y1={150} y2={150} stroke={C.axis} />
        <circle cx={95} cy={262} r={9} fill={C.bad} stroke="#fff" strokeWidth={2} />
        <circle cx={275} cy={118} r={9} fill={C.good} stroke="#fff" strokeWidth={2} />
        <circle cx={130} cy={118} r={9} fill={C.warn} stroke="#fff" strokeWidth={2} />
        <text x={200} y={308} textAnchor="middle" fontSize={11} className={svgText}>
          Kinerja waktu → (1 = sesuai jadwal)
        </text>
        <text x={14} y={150} textAnchor="middle" fontSize={11} className={svgText} transform="rotate(-90 14 150)">
          Kinerja biaya → (1 = sesuai RAB)
        </text>
      </svg>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Gantt
// ---------------------------------------------------------------------------

export function GanttDiagram() {
  // timeline x from 130 to 500; "hari ini" at x = 330
  const today = 330;
  const rows = [
    { name: "A. Survey awal", plan: [140, 260], fill: 1, color: C.good, note: "100%, selesai" },
    { name: "B. Pengukuran", plan: [250, 450], fill: 0.12, color: C.bad, note: "rencana 40%, realisasi 12%: tertinggal" },
    { name: "C. Pelaporan", plan: [400, 500], fill: 0, color: C.actual, note: "belum mulai, rencana 0%" },
  ];
  return (
    <Figure caption="Batang abu-abu adalah rencana, isinya adalah realisasi. Rencana dibagi rata per hari, jadi pada garis hari ini rencana kegiatan B sudah 40%. Isi batang B baru 12%, tertinggal 28 poin.">
      <svg viewBox="0 0 520 170" className="h-auto w-full max-w-[560px]" role="img" aria-label="Contoh Gantt chart">
        {rows.map((r, i) => {
          const y = 20 + i * 45;
          const w = r.plan[1] - r.plan[0];
          return (
            <g key={r.name}>
              <text x={0} y={y + 16} fontSize={12} fontWeight={600} className={svgStrong}>
                {r.name}
              </text>
              <rect x={r.plan[0]} y={y} width={w} height={24} rx={4} className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600" />
              {r.fill > 0 && <rect x={r.plan[0]} y={y} width={w * r.fill} height={24} rx={4} fill={r.color} />}
              <text x={Math.min(r.plan[0], 300)} y={y + 37} fontSize={10.5} className={svgText}>
                {r.note}
              </text>
            </g>
          );
        })}
        <line x1={today} x2={today} y1={10} y2={150} stroke={C.actual} strokeWidth={2} />
        <text x={today} y={165} textAnchor="middle" fontSize={11} fill={C.actual}>
          Hari ini
        </text>
      </svg>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Tiga jenis margin
// ---------------------------------------------------------------------------

export function MarginDiagram() {
  // example: kontrak 1.200, RAB 1.000, progres 40%, biaya keluar 500 (Rp juta); scale 0.32 px per juta
  const k = 0.32;
  const bar = (x: number, y: number, w: number, fill: string, label: string, dark = false) => (
    <g>
      <rect x={x} y={y} width={w} height={26} rx={3} fill={fill} />
      <text x={x + w / 2} y={y + 17} textAnchor="middle" fontSize={11} fontWeight={600} fill={dark ? "#fff" : "#123F6B"}>
        {label}
      </text>
    </g>
  );
  const x0 = 150;
  return (
    <Figure caption="Contoh: nilai kontrak Rp1,2 M, RAB Rp1 M, progres 40%, biaya keluar Rp500 jt. Proyeksi margin Rp100 jt; margin realisasi −Rp20 jt karena biaya sudah melebihi nilai pekerjaan yang selesai.">
      <svg viewBox="0 0 560 250" className="h-auto w-full max-w-[600px]" role="img" aria-label="Ilustrasi margin rencana, proyeksi, dan realisasi">
        <text x={0} y={18} fontSize={12.5} fontWeight={700} className={svgStrong}>
          Saat project selesai (proyeksi)
        </text>
        <text x={0} y={50} fontSize={11.5} className={svgText}>
          Nilai kontrak
        </text>
        {bar(x0, 33, 1200 * k, "#C9DDF0", "Rp1.200 jt")}
        <text x={0} y={86} fontSize={11.5} className={svgText}>
          Proyeksi biaya akhir
        </text>
        {bar(x0, 69, 500 * k, C.navy, "Biaya keluar 500", true)}
        {bar(x0 + 500 * k, 69, 600 * k, "#94A3B8", "Sisa RAB 600", true)}
        <rect x={x0 + 1100 * k} y={69} width={100 * k} height={26} rx={3} fill={C.good} />
        <text x={x0 + 1200 * k} y={112} textAnchor="end" fontSize={11.5} fontWeight={700} fill={C.good}>
          Proyeksi margin 100
        </text>

        <text x={0} y={150} fontSize={12.5} fontWeight={700} className={svgStrong}>
          Sampai hari ini (realisasi)
        </text>
        <text x={0} y={182} fontSize={11.5} className={svgText}>
          Pekerjaan selesai
        </text>
        {bar(x0, 165, 480 * k, "#C9DDF0", "40% × 1.200 = 480")}
        <text x={0} y={218} fontSize={11.5} className={svgText}>
          Biaya keluar
        </text>
        {bar(x0, 201, 500 * k, C.navy, "500", true)}
        <text x={x0 + 500 * k + 8} y={219} fontSize={11.5} fontWeight={700} fill={C.bad}>
          Margin realisasi −20
        </text>
        <text x={0} y={246} fontSize={10.5} className={svgText}>
          Angka dalam Rp juta.
        </text>
      </svg>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Peta risiko 3x3
// ---------------------------------------------------------------------------

export function RiskGridDiagram() {
  const lv = (s: number) => (s >= 9 ? ["Ekstrem", "#C2362F", "#fff"] : s >= 6 ? ["Tinggi", "#F8D9D6", "#C2362F"] : s >= 3 ? ["Sedang", "#FBF3E4", "#B7791F"] : ["Rendah", "#EAF5EE", "#2F855A"]);
  const rows = [3, 2, 1];
  const cols = [1, 2, 3];
  const names = ["", "Rendah", "Sedang", "Tinggi"];
  return (
    <Figure caption="Tingkat = kemungkinan × dampak. Kendala (sudah terjadi) dihitung dengan kemungkinan tertinggi.">
      <div className="inline-grid grid-cols-[6.5rem_repeat(3,minmax(4.5rem,6rem))] gap-1 text-[12px]">
        {rows.map((l) => (
          <div key={l} className="contents">
            <div className="flex items-center justify-end pr-2 text-slate-500">{names[l]}</div>
            {cols.map((d) => {
              const [name, bg, fg] = lv(l * d);
              return (
                <div key={d} className="flex h-14 flex-col items-center justify-center rounded" style={{ background: bg, color: fg }}>
                  <span className="text-[15px] font-bold">{l * d}</span>
                  <span className="text-[11px] font-semibold">{name}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div />
        {cols.map((d) => (
          <div key={d} className="text-center text-slate-500">
            {names[d]}
          </div>
        ))}
        <div className="col-span-4 mt-1 grid grid-cols-[6.5rem_1fr] text-[11.5px] text-slate-500">
          <span className="pr-2 text-right">Kemungkinan ↑</span>
          <span className="text-center">Dampak →</span>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Pareto
// ---------------------------------------------------------------------------

export function ParetoDiagram() {
  const vals = [50, 25, 12, 8, 5];
  const labels = ["Keterlambatan", "Operasional", "Personil", "Fasilitas", "Lainnya"];
  let run = 0;
  const pts = vals.map((v, i) => {
    run += v;
    return [70 + i * 80, 170 - run * 1.5] as const;
  });
  return (
    <Figure caption="Batang diurutkan dari penyebab terbesar. Garis menunjukkan persentase kumulatif. Dua penyebab pertama sudah mencapai 75%, jadi perbaikan dimulai dari sana.">
      <svg viewBox="0 0 490 210" className="h-auto w-full max-w-[520px]" role="img" aria-label="Contoh diagram Pareto">
        <line x1={30} x2={450} y1={170 - 80 * 1.5} y2={170 - 80 * 1.5} stroke={C.plan} strokeDasharray="4 4" />
        <text x={452} y={170 - 80 * 1.5 + 4} fontSize={10.5} className={svgText}>
          80%
        </text>
        {vals.map((v, i) => (
          <g key={i}>
            <rect x={45 + i * 80} y={170 - v * 2} width={50} height={v * 2} rx={3} fill={i < 2 ? C.bad : "#CBD5E1"} />
            <text x={70 + i * 80} y={188} textAnchor="middle" fontSize={10.5} className={svgText}>
              {labels[i]}
            </text>
          </g>
        ))}
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.navy} strokeWidth={2} />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={C.navy} />
        ))}
        <line x1={30} x2={450} y1={170} y2={170} stroke={C.grid} />
      </svg>
    </Figure>
  );
}
