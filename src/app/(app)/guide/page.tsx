import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PageBody } from "@/components/layout/PageBody";
import { Card, CardContent } from "@/components/ui/Card";
import { getMonitoringThresholds } from "@/lib/project-monitoring";
import { FlowDiagram, GanttDiagram, MarginDiagram, MatrixDiagram, ParetoDiagram, RiskGridDiagram, SCurveDiagram } from "@/components/guide/GuideDiagrams";
import { QuickStart, type QuickRole } from "@/components/guide/QuickStart";
import { ALL_AREAS, AREA_LABEL, ASSIGNABLE_ROLES, ROLE_DUTY, ROLE_LABEL, rolesFor } from "@/lib/permissions";

/**
 * Panduan: how the system is used from the first day of a project to its
 * close, who fills in what, and exactly how every figure is calculated. The
 * (?) buttons across the app link to the anchors on this page.
 */

/** lead: one or two plain sentences everyone reads; figure: the picture; more: the details, folded. */
type Section = { id: string; title: string; lead: React.ReactNode; figure?: React.ReactNode; more?: React.ReactNode; moreLabel?: string;  };

function More({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group mt-3 rounded-lg border border-line dark:border-slate-700">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[13px] font-semibold text-accent [&::-webkit-details-marker]:hidden">
        {label}
        <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-t border-line px-3 py-2 dark:border-slate-700">{children}</div>
    </details>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return <p className="my-2 rounded-md border border-line bg-paper px-3 py-2 text-[13px] font-semibold text-ink dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{children}</p>;
}

function Example({ children }: { children: React.ReactNode }) {
  return <p className="my-2 border-l-2 border-accent pl-3 text-[13px] text-slate-600 dark:text-slate-300">Contoh: {children}</p>;
}

function Steps({ items }: { items: [string, string, string][] }) {
  return (
    <ol className="my-2 space-y-2">
      {items.map(([who, what, where], i) => (
        <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2 text-[13.5px]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blueDark text-[11px] font-bold text-white">{i + 1}</span>
          <span>
            <span className="font-semibold text-ink dark:text-slate-100">{who}</span>: {what} <span className="text-slate-500">({where})</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default async function GuidePage() {
  const session = await getSession();
  const th = await getMonitoringThresholds();

  const groups: { title: string; sections: Section[] }[] = [
    {
      title: "Memulai",
      sections: [
        {
          id: "tentang",
          title: "Apa yang dilakukan sistem ini",
          lead: (
            <>
              <p>
                Sistem ini memantau empat hal di satu tempat: <strong>sertifikat klien</strong>, <strong>sertifikasi personil</strong>, <strong>kalibrasi alat</strong>, dan{" "}
                <strong>kondisi project</strong>. Pengingat email dikirim otomatis, kondisi project dihitung otomatis, dan tugas dibagikan ke bagian yang bertanggung jawab.
              </p>
              <p className="mt-2">Setiap bagian mengisi datanya sendiri, dan semua bagian bisa melihat data bagian lain.</p>
            </>
          ),
        },
        {
          id: "peran",
          title: "Peran dan hak akses",
          lead: <p>Semua peran bisa melihat seluruh data. Yang berbeda hanya data yang boleh diubah. Akun dan peran dibuat Administrator di menu Pengguna.</p>,
          moreLabel: "Lihat tabel hak akses",
          more: (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead>
                    <tr className="th-row">
                      <th className="py-2 pr-3">Bagian data</th>
                      {ASSIGNABLE_ROLES.filter((r) => r !== "VIEWER").map((r) => (
                        <th key={r} className="px-2 py-2 text-center">
                          {ROLE_LABEL[r]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_AREAS.map((a) => (
                      <tr key={a} className="border-b border-line/70 last:border-0 dark:border-slate-800">
                        <td className="py-2 pr-3 text-ink dark:text-slate-100">{AREA_LABEL[a]}</td>
                        {ASSIGNABLE_ROLES.filter((r) => r !== "VIEWER").map((r) => (
                          <td key={r} className="px-2 py-2 text-center">
                            {rolesFor(a).includes(r) ? <span className="font-semibold text-signal-active">Ubah</span> : <span className="text-slate-400">Lihat</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-1.5">
                {[...ASSIGNABLE_ROLES, "PIC" as const].map((r) => (
                  <li key={r}>
                    <strong className="text-ink dark:text-slate-100">{ROLE_LABEL[r]}</strong>: {ROLE_DUTY[r]}
                  </li>
                ))}
              </ul>
            </>
          ),
        },
        {
          id: "tugas",
          title: "Tugas Saya",
          lead: (
            <p>
              Menu <Link href="/tasks" className="font-semibold text-accent hover:underline">Tugas Saya</Link> berisi hal yang perlu ditindaklanjuti, dikelompokkan per bagian.
              Tugas muncul otomatis dari data dan hilang sendiri setelah datanya diperbarui. Tugas bagian lain tetap terlihat, sehingga semua tahu apa yang sedang ditunggu.
            </p>
          ),
          moreLabel: "Lihat jenis tugas per bagian",
          more: (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>PM</strong>: progres terlambat atau belum diperbarui, margin di bawah target, kendala berdampak tinggi, dokumen penutupan belum lengkap.
              </li>
              <li>
                <strong>Keuangan</strong>: termin siap ditagih, invoice lewat jatuh tempo, project tanpa RAB.
              </li>
              <li>
                <strong>QHSE</strong>: laporan HSE bulan lalu belum diisi, kecelakaan kerja, alat yang harus dikalibrasi.
              </li>
              <li>
                <strong>Human Capital</strong>: personil bertugas dengan sertifikasi berakhir, sertifikasi akan berakhir, project tanpa tim.
              </li>
              <li>
                <strong>Manajemen</strong>: project kritis yang perlu keputusan dan kekurangan margin portofolio.
              </li>
            </ul>
          ),
        },
      ],
    },
    {
      title: "Alur project",
      sections: [
        {
          id: "alur-project",
          title: "Dari kontrak sampai serah terima",
          lead: <p>Project berjalan dalam tiga tahap. Setiap langkah diisi oleh satu bagian, dan hasilnya langsung terlihat oleh bagian lain.</p>,
          figure: <FlowDiagram />,
          moreLabel: "Lihat langkah lengkap dan letak menunya",
          more: (
            <Steps
              items={[
                ["PM", "membuat project: nomor, klien, nilai kontrak, tanggal mulai, target selesai, PIC, portofolio, lokasi. Paling cepat dengan mengunggah file RAB, data terisi otomatis", "Daftar Project, Tambah project"],
                ["PM atau Keuangan", "mengunggah RAB. RAB pertama dikunci sebagai baseline (rencana awal) untuk pembanding biaya dan margin", "project, Keuangan, RAB dan biaya"],
                ["PM", "mengisi milestone beserta bobot, rencana mulai, dan rencana selesai. Ini membentuk Gantt chart dan garis rencana kurva S", "project, Jadwal dan progres, Gantt dan milestone"],
                ["PM", "bila punya jadwal resmi dari kontrak, mengisi rencana kurva S (persen kumulatif per tanggal)", "project, Jadwal dan progres, Progres, Atur rencana"],
                ["Human Capital", "menugaskan personil ke project; sistem memeriksa sertifikasi setiap personil sampai akhir masa tugas", "project, Risiko HSE dan tim, Tim"],
                ["Keuangan", "mengisi termin pembayaran: nilai, rencana tanggal tagih, syarat penagihan", "project, Keuangan, Termin dan penagihan"],
                ["PM atau PIC lapangan", "memperbarui progres secara rutin (boleh harian), dan menandai milestone yang selesai", "project, Perbarui progres, atau halaman PIC"],
                ["PM atau Keuangan", "mencatat realisasi biaya beserta penyebabnya, satu per satu atau impor Excel", "project, Keuangan, RAB dan biaya"],
                ["PM atau QHSE", "mencatat kendala dan risiko beserta kemungkinan, dampak, kategori, dan penanggung jawab", "project, Risiko HSE dan tim, Kendala dan risiko"],
                ["QHSE", "mengisi laporan HSE setiap bulan, paling lambat tanggal 5 bulan berikutnya", "project, Risiko HSE dan tim, HSE"],
                ["Keuangan", "mencatat invoice dan pembayaran setiap termin", "project, Keuangan, Termin dan penagihan"],
                ["PM", "saat selesai, mengubah status menjadi Selesai dan melengkapi BAPP, BAST, dan laporan akhir", "project, Dokumen, Penutupan"],
              ]}
            />
          ),
        },
        {
          id: "rutinitas",
          title: "Rutinitas per bagian",
          lead: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Setiap ada kemajuan</strong>: PM atau PIC memperbarui progres. Progres dianggap basi bila tidak diperbarui {th.progressStaleDays} hari.
              </li>
              <li>
                <strong>Setiap ada biaya</strong>: PM atau Keuangan mencatat biaya beserta penyebabnya.
              </li>
              <li>
                <strong>Setiap minggu</strong>: semua bagian memeriksa Tugas Saya. Manajemen menerima laporan mingguan melalui email.
              </li>
              <li>
                <strong>Setiap bulan</strong>: QHSE mengisi laporan HSE bulan lalu. Keuangan memeriksa termin yang jatuh tempo.
              </li>
              <li>
                <strong>Saat ada kejadian</strong>: kendala, addendum, dan penugasan personil dicatat saat itu juga.
              </li>
            </ul>
          ),
        },
      ],
    },
    {
      title: "Cara membaca angka",
      sections: [
        {
          id: "progres",
          title: "Progres dan deviasi",
          lead: (
            <p>
              <strong>Progres realisasi</strong> adalah pekerjaan yang sudah selesai. <strong>Progres rencana</strong> adalah pekerjaan yang seharusnya sudah selesai hari ini.
              Selisih keduanya disebut <strong>deviasi</strong>. Deviasi negatif berarti terlambat.
            </p>
          ),
          figure: <SCurveDiagram />,
          moreLabel: "Lihat asal angka progres",
          more: (
            <>
              <p>
                Progres realisasi diambil dari laporan progres atau dari penyelesaian milestone (total bobot milestone selesai), mana yang tanggalnya paling akhir.
              </p>
              <p className="mt-2">Garis rencana diambil dari sumber pertama yang tersedia:</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>rencana kurva S yang diisi pada tab Jadwal dan progres (paling akurat),</li>
                <li>tanggal rencana dan bobot milestone,</li>
                <li>kurva S standar dari tanggal mulai sampai target selesai.</li>
              </ol>
              <Formula>Deviasi = progres realisasi − progres rencana (dalam poin persen)</Formula>
            </>
          ),
        },
        {
          id: "kondisi",
          title: "Kondisi project",
          lead: (
            <ul className="space-y-1.5">
              <li>
                <strong className="text-signal-active">Sesuai rencana</strong>: tertinggal kurang dari {th.deviationWarning} poin, atau mendahului rencana.
              </li>
              <li>
                <strong className="text-signal-soon">Waspada</strong>: tertinggal {th.deviationWarning} sampai kurang dari {th.deviationCritical} poin.
              </li>
              <li>
                <strong className="text-signal-expired">Kritis</strong>: tertinggal {th.deviationCritical} poin atau lebih, atau sudah melewati target selesai.
              </li>
              <li className="text-slate-500">Batas ini dapat diubah Administrator di menu Pengaturan.</li>
            </ul>
          ),
        },
        {
          id: "kinerja-waktu",
          title: "Kinerja waktu (SPI)",
          lead: (
            <p>
              Menjawab pertanyaan: <strong>apakah pekerjaan secepat rencana?</strong> Nilai 1,00 berarti tepat jadwal, di bawah 1 terlambat, di atas 1 lebih cepat.
            </p>
          ),
          figure: <MatrixDiagram />,
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <Formula>Kinerja waktu = progres realisasi ÷ progres rencana hari ini</Formula>
              <Example>rencana hari ini 50%, realisasi 40%. Kinerja waktu = 40 ÷ 50 = 0,80, artinya pekerjaan baru mencapai 80% dari yang seharusnya.</Example>
              <p>Warna: hijau 0,95 ke atas, kuning 0,85 sampai 0,95, merah di bawah 0,85.</p>
            </>
          ),
        },
        {
          id: "kinerja-biaya",
          title: "Kinerja biaya (CPI)",
          lead: (
            <p>
              Menjawab pertanyaan: <strong>apakah biaya sesuai anggaran untuk pekerjaan yang sudah selesai?</strong> Nilai 1,00 berarti sesuai RAB, di bawah 1 boros, di atas 1
              hemat. Perlu RAB dan realisasi biaya.
            </p>
          ),
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <Formula>Kinerja biaya = (progres realisasi × total RAB) ÷ biaya yang sudah keluar</Formula>
              <Example>
                total RAB Rp1 miliar, progres 40%, jadi pekerjaan selesai bernilai Rp400 juta menurut RAB. Biaya keluar Rp500 juta. Kinerja biaya = 400 ÷ 500 = 0,80, artinya
                setiap Rp1 biaya baru menghasilkan pekerjaan senilai Rp0,80.
              </Example>
            </>
          ),
        },
        {
          id: "proyeksi-selesai",
          title: "Proyeksi tanggal selesai",
          lead: <p>Perkiraan tanggal selesai bila laju pekerjaan saat ini berlanjut. Bila lewat dari target, project diperkirakan terlambat.</p>,
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <Formula>Proyeksi selesai = tanggal mulai + (durasi rencana ÷ kinerja waktu)</Formula>
              <Example>durasi rencana 300 hari, kinerja waktu 0,80. Proyeksi durasi = 300 ÷ 0,80 = 375 hari, atau terlambat sekitar 75 hari.</Example>
              <p>Bila belum ada rencana yang bisa dibandingkan, dipakai laju rata-rata harian sejak mulai.</p>
            </>
          ),
        },
        {
          id: "proyeksi-margin",
          title: "Margin rencana, realisasi, dan proyeksi",
          lead: (
            <ul className="space-y-1.5">
              <li>
                <strong>Margin rencana</strong>: keuntungan yang direncanakan saat project dimulai.
              </li>
              <li>
                <strong>Margin realisasi</strong>: keuntungan atas pekerjaan yang sudah selesai sampai hari ini.
              </li>
              <li>
                <strong>Proyeksi margin</strong>: perkiraan keuntungan saat project selesai. Angka ini dibandingkan dengan target margin.
              </li>
            </ul>
          ),
          figure: <MarginDiagram />,
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <Formula>Margin rencana = nilai kontrak awal − total RAB awal (baseline)</Formula>
              <Formula>Margin realisasi = (progres × nilai kontrak) − biaya yang sudah keluar</Formula>
              <p>Pada awal project margin realisasi mudah naik turun karena biaya mobilisasi belum diimbangi progres.</p>
              <Formula>Proyeksi biaya akhir = biaya yang sudah keluar + sisa RAB untuk pekerjaan yang belum dikerjakan</Formula>
              <Formula>Proyeksi margin = nilai kontrak saat ini − proyeksi biaya akhir</Formula>
              <Example>
                kontrak Rp1,2 miliar, RAB Rp1 miliar, progres 40%, biaya keluar Rp500 juta. Sisa RAB = 60% × Rp1 miliar = Rp600 juta. Proyeksi biaya akhir = Rp1,1 miliar.
                Proyeksi margin = Rp100 juta (8,3%). Margin rencana Rp200 juta (16,7%), jadi kelebihan biaya Rp100 juta langsung mengurangi proyeksi.
              </Example>
              <p>
                <strong>Target margin</strong> diambil dari RAB project (kolom target margin), atau margin rencana bila tidak ada. Project di bawah target bila proyeksinya lebih
                rendah lebih dari 1 poin. Proyeksi tidak pernah menganggap sisa pekerjaan lebih murah dari RAB.
              </p>
            </>
          ),
        },
        {
          id: "keuangan",
          title: "PAD, piutang, dan arus kas",
          lead: (
            <ul className="space-y-1.5">
              <li>
                <strong>Piutang</strong>: sudah ditagih, belum dibayar.
              </li>
              <li>
                <strong>PAD</strong> (pendapatan akan diterima): nilai kontrak yang belum diterima.
              </li>
              <li>
                <strong>Arus kas</strong>: uang masuk dan keluar enam bulan ke belakang, dan perkiraan enam bulan ke depan.
              </li>
            </ul>
          ),
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <Formula>Piutang = invoice yang sudah ditagih − pembayaran yang sudah diterima</Formula>
              <Formula>PAD = nilai kontrak − pembayaran yang sudah diterima</Formula>
              <p>Invoice lewat jatuh tempo bila tanggal jatuh temponya terlewati, atau {th.invoiceOverdueDays} hari setelah tanggal invoice bila tidak ada jatuh tempo.</p>
              <p className="mt-2">
                Arus kas bulan lalu: pembayaran diterima (masuk) dan biaya tercatat (keluar). Bulan depan: invoice dibayar pada jatuh tempo, termin ditagih pada tanggal rencana,
                dan sisa biaya dibagi ke bulan berikutnya mengikuti rencana progres. Tersedia untuk portofolio (Monitoring Project, Keuangan) dan per project (tab Keuangan, Arus
                kas).
              </p>
            </>
          ),
        },
        {
          id: "pareto",
          title: "Pareto penyebab masalah",
          lead: (
            <p>
              Pareto mengurutkan penyebab dari yang terbesar. Perbaiki penyebab paling kiri lebih dulu, karena biasanya sedikit penyebab menyumbang sebagian besar masalah. Klik
              batang untuk melihat project penyumbangnya.
            </p>
          ),
          figure: <ParetoDiagram />,
          moreLabel: "Lihat asal data dan cara menghitung",
          more: (
            <>
              <p>
                <strong>Biaya</strong> (rupiah) berasal dari baris realisasi biaya, berdasarkan kolom <strong>Penyebab</strong>:
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>&quot;Akibat keterlambatan&quot; masuk ke Keterlambatan,</li>
                <li>&quot;Pekerjaan tambahan&quot; masuk ke Kerja tambahan tanpa addendum, hanya bagian yang belum tertutup kenaikan nilai kontrak,</li>
                <li>&quot;Pekerjaan ulang atau perbaikan&quot; masuk ke Pekerjaan ulang,</li>
                <li>&quot;Normal&quot; dihitung per bagian RAB: realisasi dikurangi RAB bagian × progres. Bila lebih, selisihnya masuk ke &quot;[bagian] di atas RAB&quot;.</li>
              </ul>
              <Example>Operasional di RAB Rp200 juta, progres 50%, porsinya Rp100 juta. Realisasi Rp130 juta, jadi Rp30 juta masuk ke Operasional di atas RAB.</Example>
              <p className="mt-2">
                <strong>Kendala</strong> (bobot) berasal dari kendala dan risiko 12 bulan terakhir. Bobot per tingkat: rendah 1, sedang 2, tinggi 3, ekstrem 4, lalu dijumlah per
                kategori (Teknis, Klien, SDM, Keuangan, HSE, Cuaca, Lainnya). Kategori dipilih saat mencatat kendala.
              </p>
              <Example>kategori Klien punya dua kendala tinggi (3 + 3) dan satu sedang (2), bobotnya 8.</Example>
              <p className="mt-2">Untuk satu project, lihat tab Keuangan, RAB dan biaya, Penyebab pembengkakan biaya.</p>
            </>
          ),
        },
        {
          id: "peta-risiko",
          title: "Peta risiko dan kendala",
          lead: (
            <p>
              Isi di tab Risiko, HSE dan tim pada setiap project. Pilih <strong>Risiko</strong> (belum terjadi) dan isi kemungkinan serta dampaknya, atau{" "}
              <strong>Kendala</strong> (sudah terjadi) dan isi dampaknya. Makin ke kanan atas, makin perlu ditangani.
            </p>
          ),
          figure: <RiskGridDiagram />,
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <Formula>Tingkat = nilai kemungkinan × nilai dampak (rendah 1, sedang 2, tinggi 3)</Formula>
              <p>Skor 1 sampai 2 rendah, 3 sampai 5 sedang, 6 sampai 8 tinggi, 9 ekstrem. Isi juga kategori, penanggung jawab, dan target tanggal tindak lanjut.</p>
              <p className="mt-2">Peta di Monitoring Project menggabungkan semua project; peta di halaman project hanya project tersebut. Klik kotak untuk melihat daftarnya.</p>
            </>
          ),
        },
        {
          id: "hse",
          title: "HSE: LTIFR, TRIR, dan jam kerja aman",
          lead: (
            <ul className="space-y-1.5">
              <li>
                <strong>LTIFR</strong>: jumlah cedera yang membuat pekerja tidak bisa bekerja, per 1 juta jam kerja.
              </li>
              <li>
                <strong>TRIR</strong>: jumlah semua cedera yang wajib dicatat, per 1 juta jam kerja.
              </li>
              <li>
                <strong>Jam kerja aman</strong>: jam kerja sejak cedera terakhir. Makin kecil LTIFR dan TRIR makin baik, targetnya 0.
              </li>
            </ul>
          ),
          moreLabel: "Lihat cara menghitung",
          more: (
            <>
              <p>QHSE atau PM mengisi laporan HSE setiap bulan: jam kerja seluruh personil dan jumlah kejadian per tingkat.</p>
              <Formula>LTIFR = (cedera hilang hari kerja + fatal) × 1.000.000 ÷ jam kerja</Formula>
              <Formula>TRIR = (fatal + hilang hari kerja + perawatan medis) × 1.000.000 ÷ jam kerja</Formula>
              <p>P3K ringan dan nyaris celaka tidak termasuk TRIR.</p>
              <Example>200.000 jam kerja dengan satu cedera hilang hari kerja: LTIFR = 1 × 1.000.000 ÷ 200.000 = 5,00.</Example>
            </>
          ),
        },
        {
          id: "gantt",
          title: "Gantt chart",
          lead: (
            <p>
              Gantt chart (tab Jadwal dan progres) menampilkan setiap milestone sebagai batang. Hijau selesai tepat waktu, biru berjalan, merah terlambat. Isi rencana mulai,
              rencana selesai, dan bobot pada milestone; tanggal aktual terisi saat status diubah.
            </p>
          ),
          figure: <GanttDiagram />,
          moreLabel: "Lihat hubungannya dengan kurva S",
          more: (
            <p>
              Kurva S (tab Ringkasan dan Jadwal dan progres) membandingkan progres rencana dan realisasi kumulatif. Setiap laporan progres menjadi satu titik pada garis
              realisasi, jadi progres boleh diperbarui setiap hari. Rencana kurva S juga dapat dibuat per hari untuk project sampai 13 bulan.
            </p>
          ),
        },
        {
          id: "portofolio",
          title: "Membaca Monitoring Project",
          lead: (
            <p>
              Angka utama adalah gabungan project yang sedang ditampilkan. Pilih satu portofolio di filter, semua kartu ikut berubah. Kartu <strong>Kinerja per portofolio</strong>{" "}
              di tab Ringkasan membandingkan portofolio berdampingan; klik barisnya untuk melihat project di dalamnya.
            </p>
          ),
          moreLabel: "Lihat cara menggabungkan angka",
          more: (
            <p>
              Angka portofolio adalah rata-rata tertimbang nilai kontrak, sehingga project bernilai besar lebih berpengaruh. Margin portofolio dihitung dari total rupiah, bukan
              rata-rata persen. Tren kinerja waktu dan biaya dapat dipilih per portofolio.
            </p>
          ),
        },
      ],
    },
    {
      title: "Lainnya",
      sections: [
        {
          id: "pengingat",
          title: "Pengingat email",
          lead: (
            <p>
              Pengingat dikirim 90, 60, 30, 14, 7, 3, 1, dan 0 hari sebelum tanggal berakhir sertifikat, sertifikasi personil, kalibrasi alat, dan target selesai project. Penerima
              adalah PIC data tersebut, dengan salinan ke atasan yang aktif di menu Atasan. Isi email diatur di menu Template Email.
            </p>
          ),
        },
        {
          id: "istilah",
          title: "Daftar istilah",
          lead: (
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
              {[
                ["RAB", "Rencana anggaran biaya: rincian biaya yang direncanakan untuk menyelesaikan project."],
                ["Baseline", "RAB, nilai kontrak, dan target selesai yang dikunci saat RAB pertama diunggah; pembanding untuk semua perubahan."],
                ["Addendum", "Perubahan kontrak: nilai, lingkup, atau target selesai."],
                ["Termin", "Bagian nilai kontrak yang ditagih pada tahap tertentu."],
                ["BAPP", "Berita acara penyelesaian pekerjaan."],
                ["BAST", "Berita acara serah terima."],
                ["PIC", "Penanggung jawab project di lapangan; dapat memperbarui progres melalui tautan email."],
                ["SPI", "Schedule Performance Index, di sistem disebut kinerja waktu."],
                ["CPI", "Cost Performance Index, di sistem disebut kinerja biaya."],
                ["LTIFR", "Lost Time Injury Frequency Rate, tingkat cedera hilang hari kerja per 1 juta jam kerja."],
                ["TRIR", "Total Recordable Incident Rate, tingkat seluruh cedera tercatat per 1 juta jam kerja."],
                ["Kurva S", "Grafik progres kumulatif terhadap waktu; bentuknya seperti huruf S karena pekerjaan lambat di awal dan akhir."],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold text-ink dark:text-slate-100">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ),
        },
      ],
    },
  ];

  const quickRole: QuickRole = (["PM", "FINANCE", "QHSE", "HC", "MANAGEMENT", "ADMIN"] as const).find((r) => r === session?.role) ?? "PM";

  return (
    <>
      <Navbar title="Panduan" subtitle="Cara memakai sistem dan cara membaca setiap angka" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_1fr]">
          <nav aria-label="Isi panduan" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <Card>
              <CardContent className="space-y-3 text-[13px]">
                <a href="#mulai-cepat" className="block font-semibold text-ink hover:text-accent dark:text-slate-200">
                  Mulai cepat
                </a>
                {groups.map((g) => (
                  <div key={g.title}>
                    <p className="mb-1 text-[12px] font-semibold text-slate-500">{g.title}</p>
                    <ul className="space-y-1">
                      {g.sections.map((s) => (
                        <li key={s.id}>
                          <a href={`#${s.id}`} className="text-ink hover:text-accent dark:text-slate-200">
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </nav>
          <div className="min-w-0 space-y-4">
            <Card id="mulai-cepat" className="scroll-mt-24">
              <CardContent className="text-[14px] text-slate-700 dark:text-slate-300">
                <h2 className="text-[16px] font-bold text-ink dark:text-slate-100">Mulai cepat</h2>
                <p className="mb-2 mt-1 text-[13px] text-slate-500">Pilih peran Anda. Inilah hal yang perlu dikerjakan, lengkap dengan tombol menuju halamannya.</p>
                <QuickStart initial={quickRole} />
              </CardContent>
            </Card>
            {groups.flatMap((g) =>
              g.sections.map((s) => (
                <Card key={s.id} id={s.id} className="scroll-mt-24">
                  <CardContent className="max-w-[78ch] text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                    <h2 className="mb-2 text-[16px] font-bold text-ink dark:text-slate-100">{s.title}</h2>
                    {s.lead}
                    {s.figure}
                    {s.more && <More label={s.moreLabel ?? "Lihat rincian"}>{s.more}</More>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
