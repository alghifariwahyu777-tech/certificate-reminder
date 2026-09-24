# Certificate Reminder — PT Sucofindo (Persero)

Sistem internal untuk mengelola sertifikat klien yang menggunakan jasa sertifikasi, inspeksi,
dan kalibrasi PT Sucofindo (Persero) — lengkap dengan pemantauan masa berlaku, riwayat
perpanjangan, reminder email, notification center, audit log, kontrol akses berbasis role, dan
export laporan.

## Teknologi

| Layer          | Teknologi                                   |
| -------------- | -------------------------------------------- |
| Framework      | Next.js 15 (App Router)                      |
| Bahasa         | TypeScript                                   |
| Styling        | Tailwind CSS                                 |
| ORM / Database | Prisma ORM + SQLite *(siap dimigrasikan ke PostgreSQL/Supabase)* |
| Form & Validasi| React Hook Form + Zod                        |
| Auth           | Session JWT (jose) + bcrypt, role Admin/Viewer |
| Email          | Resend (mode simulasi otomatis jika API key belum diisi) |
| Export         | ExcelJS (.xlsx) + PDFKit (.pdf)              |
| Grafik         | Recharts                                     |
| Ikon           | Lucide React                                 |

## Fitur

### Penyempurnaan Terbaru
- **Dashboard Utama dirombak total** — sekarang mencakup **seluruh 4 domain** reminder, bukan
  cuma Certificate:
  - Banner **"Perlu Perhatian"** di paling atas — rincian per domain (mis. "3 Sertifikat, 1
    Project"), klik untuk langsung ke halaman terkait.
  - **4 Tab** (Certificate / Personnel / Project / Equipment) — masing-masing dengan kartu KPI
    sendiri (Total/Aktif/Segera Berakhir/Expired) dan tabel "Segera Berakhir". Tab Certificate
    tetap menyertakan grafik distribusi kategori & tren bulanan.
  - Reminder Center & Recent Activity tetap di bagian bawah, sudah mencakup 4 domain sejak
    sebelumnya.
- **Bug fix**: kolom search di Certificate, Personnel Certification, Project, dan Equipment
  Calibration sekarang otomatis melebar saat diklik/diketik (akar masalahnya: lebar kolom yang
  terlalu sempit dari penataan "1 baris" sebelumnya, bukan soal warna teks) — jadi tulisan yang
  diketik tetap terlihat penuh.
- Menu **Monitoring** dipindah masuk ke grup **Client** di Sidebar.
- Filter di halaman **Project Monitoring** & **Equipment Calibration** dirapikan jadi 1 baris,
  dan ditambahkan filter **Tahun** (sebelumnya cuma ada di Certificate & Personnel).
- **Kartu ringkasan monitoring** ditambahkan di halaman Project Monitoring: Total Nilai
  Kontrak, Nilai Kontrak Berjalan, Nilai Kontrak Selesai, Rata-rata Lama Pengerjaan.
- **Notifikasi diperluas** — Sertifikasi Personil, Project (yang masih Berjalan), dan Equipment
  yang sudah Expiring Soon/Expired sekarang ikut muncul di lonceng Notifikasi internal
  (sebelumnya cuma Sertifikat Klien & siklus Pengajuan).
- **Semua kolom tabel** di Sertifikasi Personil, Project Monitoring, dan Equipment Calibration
  sekarang bisa diurutkan naik/turun dengan klik header — sama seperti tabel Certificate.
- **Bug fix**: Sertifikasi Personil & Equipment yang pemiliknya non-aktif sekarang tercatat
  "Dilewati" di log (sebelumnya dilewati diam-diam, bikin widget Dashboard salah hitung
  "pending" selamanya).
- Label menu yang terpotong 2 baris dipersingkat; tombol collapse Sidebar diperbesar &
  diperbaiki posisinya (sebelumnya tertutup area konten).
- Nama aplikasi di halaman Admin (Sidebar, login, judul tab) diubah jadi **"Reminder
  System"** — Client Portal tidak terpengaruh.
- **Supervisors (baru)** — menu **Supervisors**: direktori atasan terpusat. Setiap atasan
  berstatus **Aktif** otomatis di-CC ke **seluruh** reminder (Sertifikat Klien, Sertifikasi
  Personil, Project, Equipment) — tidak perlu dipilih satu-satu per data. Field "Email CC"
  di keempat form dihapus karena sudah otomatis. Kalau ada restrukturisasi, cukup
  nonaktifkan/ubah data di satu tempat ini.
- **Project Email Template** dan **Equipment Email Template** — wording email reminder untuk
  kedua fitur baru ini sekarang bisa diedit lewat UI (mode Sederhana/Lanjutan + preview
  langsung), persis seperti Email Template klien & personil. Sebelumnya hardcode di kode.
- Widget "pending reminder" di Dashboard sekarang ikut menghitung **Project Monitoring** dan
  **Equipment Calibration**, tidak cuma sertifikat klien & personil.
- **Trash** diperluas mencakup Project dan Equipment yang dihapus — bisa dipulihkan atau
  dihapus permanen dari tempat yang sama seperti sertifikat/sertifikasi personil.
- **Project Monitoring (baru)** — fitur pengembangan dari Certificate Reminder untuk memantau
  kontrak/pekerjaan internal perusahaan: nomor & nama project, kategori/portofolio (PIK, Serco,
  dll.), klien, PIC, nilai kontrak, tanggal mulai & target selesai, status (Berjalan/
  Selesai/Dibatalkan). Reminder otomatis ke PIC + CC atasan mengikuti milestone yang sama
  (90/60/30/14/7/3/1/0 hari) selama status masih "Berjalan". Mendukung **riwayat Addendum**
  (perpanjangan/perubahan kontrak) — menambah addendum otomatis memperbarui target selesai
  project dan tercatat sebagai riwayat permanen. Menu: **Project Monitoring**,
  **Project Categories**.
- **Equipment Calibration (baru)** — pengingat kalibrasi alat milik internal Sucofindo: nama,
  merk, tipe, warna, nomor aset, kategori, PIC (terhubung ke data Personil yang sudah ada, NIP
  otomatis ikut), tanggal kalibrasi terakhir & berikutnya. Reminder otomatis ke PIC + CC atasan,
  milestone sama seperti fitur lain. Menu: **Equipment Calibration**, **Equipment Categories**.
- Kedua fitur baru ini pakai template email standar (belum bisa diedit lewat UI seperti Email
  Template klien/personil — menyusul).
- **Bug fix**: angka "belum direminder" di Dashboard tidak lagi nyangkut setelah kirim reminder
  manual — halaman sekarang otomatis refresh datanya.
- **Bug fix**: konsistensi judul halaman vs nama menu di Sidebar, diperbaiki di 11 halaman
  (Certificate, Personnel, dst).
- **Bug fix**: mode "Lanjutan (HTML)" pada Email Template (klien & personil) sekarang selalu
  sinkron dengan mode "Sederhana" — warna Tanggal Berakhir/Sisa Hari otomatis menyesuaikan
  urgensi lewat token baru `{{statusColor}}`, dan header sudah pakai logo di kedua mode.
- Font header email ("PT SUCOFINDO (Persero)", "Certificate/Personnel Reminder System")
  diperbesar +3pt.
- **Lupa Password untuk login Admin internal** (`/forgot-password`, `/reset-password`) — sama
  seperti yang sudah ada di Client Portal.
- **Sidebar bisa diminimalkan** (ikon panah di tepi kanan sidebar), preferensinya tersimpan di
  browser. Scroll konten utama sekarang independen dari sidebar (sidebar tidak lagi ikut
  ter-scroll saat isi halaman panjang).
- **Personnel Email Template** (`/personnel-email-template`, Admin): template email reminder
  sertifikasi personil sekarang bisa diedit lewat UI — mode Sederhana (isi teks, tabel detail
  otomatis) atau Lanjutan (HTML penuh), sama seperti Email Template sertifikat klien tapi
  dengan field & placeholder khusus personil (`{{employeeName}}`, `{{position}}`, dll.), tanpa
  tautan Client Portal. Sebelumnya wording ini hardcode di kode, tidak bisa diubah tanpa deploy.
- **Import Excel & Trash untuk Sertifikasi Personil**: sekarang bisa tambah banyak data
  sekaligus lewat Excel (`/personnel-certifications/import`, format sama dengan import
  sertifikat klien — Personil & Kategori otomatis dibuat jika belum ada). Halaman **Trash**
  diperluas untuk menampilkan sertifikasi personil yang dihapus (soft-delete), bisa dipulihkan
  atau dihapus permanen dari tempat yang sama dengan sertifikat klien.
- **Pengelompokan menu Sidebar**: menu Personnel/Personnel Certifications/Certification
  Categories sekarang dikelompokkan dalam 1 bagian dengan label & garis pembatas, memisahkan
  jelas dari menu terkait klien.
- **UX & branding batch**: hapus efek garis di halaman login, konsistensi bahasa Inggris untuk
  label menu Personnel/Personnel Certifications/Certification Categories, logo Sucofindo
  ditambahkan ke template email reminder (sertifikat klien & personil), keterangan tujuan
  reminder di field Email PIC.
- **Settings (Admin)**: halaman baru `/settings` untuk nomor WhatsApp admin, ditampilkan sebagai
  tombol mengambang "Hubungi Admin" di Client Portal (link `wa.me`, tanpa API berbayar).
- **Self-service password (Client Portal)**: klien bisa ubah password sendiri
  (`/portal/change-password`) dan reset lewat email jika lupa (`/portal/forgot-password` →
  tautan email → `/portal/reset-password`), pakai Gmail SMTP yang sama.
- Skema: `AppSettings` (baru), `ClientUser.resetToken`/`resetTokenExpiry`. (Reminder sertifikasi
  personil lewat WhatsApp sempat dipertimbangkan tapi diputuskan tidak dilanjutkan — semua
  layanan WhatsApp Business API berbayar per pesan, tidak ada opsi gratis setara Gmail SMTP.
  Reminder personil tetap berjalan lewat email, ke karyawan + CC HR/atasan.)
- **Personnel Certification Reminder** — fitur pengingat baru, terpisah dari sertifikat klien:
  melacak sertifikasi/kompetensi personil internal (K3, SIM, auditor, dll.) lewat menu
  **Personil** (`/employees`), **Kategori Sertifikasi Personil** (`/personnel-categories`), dan
  **Sertifikasi Personil** (`/personnel-certifications`). Reminder harian yang sudah ada kini
  juga memindai data ini dan mengirim ke **email personil sekaligus email HR/atasan (CC)**.
  Personil tidak punya login sendiri — murni dikelola Admin, hanya menerima email. Termasuk
  export Excel tersendiri di halaman Reports.
- **Email reminder pindah dari Resend ke Gmail SMTP**: tidak perlu verifikasi domain (cocok untuk
  yang belum punya domain sendiri) — cukup akun Gmail + App Password. Env var
  `RESEND_API_KEY`/`EMAIL_FROM` diganti `GMAIL_USER`/`GMAIL_APP_PASSWORD`/`EMAIL_FROM_NAME`.
  Sekalian diperbaiki 2 bug: cron reminder harian tidak pernah benar-benar jalan (Vercel Cron
  kirim `GET`, tapi route-nya cuma terima `POST`) dan middleware sempat memblokir request cron
  itu sendiri sebelum sampai ke kodenya.
- **Notifikasi Application**: notifikasi otomatis di 4 titik proses — permohonan baru/diajukan ulang
  (ke Admin), dokumen perlu revisi (ke Klien, sekaligus otomatis mengubah status permohonan —
  tidak perlu lagi 2 langkah manual), permohonan disetujui (ke Klien), dan sertifikat terbit (ke
  Klien). Client Portal sekarang punya lonceng notifikasi sendiri (`/api/portal/notifications`),
  terpisah dari Notification Center internal.
- **Monitoring Manajemen** (`/monitoring`, Admin & Viewer): dashboard baru menampilkan tahap
  permohonan yang sedang berjalan, sudah berapa hari di tahap itu, total lama proses, dan
  **Nilai Kontrak** (Rupiah, diinput Admin di halaman detail permohonan) — lengkap dengan kartu
  ringkasan (Total/Berjalan/Selesai) dan **export Excel**.
- **Phase 9 — Reporting**: 3 laporan baru melengkapi 6 laporan Certificate yang sudah ada —
  **Status Permohonan** (semua Application + lama proses hingga sertifikat terbit), **Jadwal
  Surveillance** (seluruh kunjungan surveillance lintas sertifikat), dan **Kepatuhan SLA**
  (aktual vs target hari per tahap workflow, status Tepat Waktu/Terlambat/Berjalan). Sama
  seperti laporan lain, bisa diunduh Excel atau PDF dari `/reports`.
- **Phase 8 — Surveillance**: begitu sertifikat diterbitkan dari layanan yang membutuhkan
  surveillance (`Service.requiresSurveillance`), sistem otomatis membuat jadwal
  `Surveillance` — satu per kunjungan, berjarak `surveillanceIntervalMonths` bulan dari
  tanggal terbit. Admin kelola status (Terjadwal/Dikonfirmasi/Berjalan/Selesai/Dibatalkan/
  Ditunda), PIC, dan hasil dari halaman detail sertifikat. Jadwal yang lewat tapi belum
  selesai otomatis ditandai "Terlambat" (dihitung on-the-fly, sama seperti status sertifikat
  — tidak butuh job terpisah). Klien melihat jadwal surveillance terdekat di Dashboard Portal.
- **Phase 7 — Certificate Issuance**: begitu permohonan berstatus "Disetujui", tombol
  **"Terbitkan Sertifikat"** muncul di `/applications/[id]`. Mengisi form (nomor, kategori,
  tanggal, PIC, upload dokumen) dan submit akan **otomatis**: membuat record `Certificate`
  baru (langsung masuk sistem reminder harian yang sudah ada), menyelesaikan `Application`
  (status → Selesai), dan menutup seluruh tahap tracking (Phase 6) yang tersisa. Klien melihat
  banner "Sertifikat telah diterbitkan" di halaman permohonannya, dengan link ke Sertifikat
  Saya. *(Penjadwalan Surveillance otomatis untuk layanan yang membutuhkannya — lihat Phase 8
  di Roadmap.)*
- **Phase 6 — Tracking**: begitu permohonan disetujui, sistem otomatis membuat timeline
  progress dari `WorkflowStage` layanan tersebut (`ApplicationStage`, satu per tahap, sesuai
  urutan). Internal update status tiap tahap (Belum Dimulai/Sedang Berjalan/Selesai), PIC, dan
  catatan internal dari `/applications/[id]`. Klien lihat versi read-only di
  `/portal/applications/[id]` — hanya tahap yang ditandai "tampilkan ke klien", dengan bahasa
  yang lebih mudah dipahami (`clientDescription`), bukan nama tahap internal.
- **Phase 5 — Application**: klien bisa mengajukan sertifikasi online dari Client Portal
  (`/portal/applications/new`), upload dokumen per checklist persyaratan layanan, lalu
  mengajukan. Internal me-review tiap dokumen (`/applications/[id]`) — setujui atau minta
  revisi dengan komentar — dan mengatur status keseluruhan permohonan (Draft → Diajukan →
  Review → Revisi/Disetujui/Ditolak). Dokumen mendukung **versioning** — versi lama tidak
  dihapus saat klien mengunggah ulang setelah revisi diminta.
- **Phase 4 — Service Catalog**: master data layanan sertifikasi (`Service`), jenis dokumen
  (`DocumentType`), persyaratan dokumen per layanan (`ServiceRequirement`), dan tahap workflow
  per layanan (`WorkflowStage`) — **seluruhnya data-driven**, bukan hard-code per nama layanan.
  Admin kelola dari `/services` (+ `/services/[id]` untuk persyaratan & workflow) dan
  `/document-types`. Klien bisa lihat katalog read-only dari `/portal/services`.
- **Migrasi ke PostgreSQL (Supabase)**: `schema.prisma` sekarang pakai provider `postgresql`
  dengan `url` (pooler, untuk query normal) dan `directUrl` (koneksi langsung, khusus migrasi)
  — pola standar Prisma+Supabase.
- **Penyimpanan dokumen pindah ke Google Drive**: menggantikan `public/uploads` yang tidak
  bertahan di deployment serverless. File diunggah via Service Account, diakses lewat proxy
  `/api/files/[fileId]` yang mensyaratkan login — dokumen di Drive sendiri tetap privat.
- **Client Portal (fondasi)**: login terpisah untuk klien (`/portal/login`), dashboard &
  daftar sertifikat sendiri, admin bisa membuat akun portal per klien dari halaman `/clients`.
- **Soft delete + Trash**: menghapus sertifikat (satu atau bulk) sekarang memindahkannya ke
  `/trash` (Admin only), bukan menghapus permanen. Dari sana bisa **dipulihkan** atau **dihapus
  permanen**. Semua query lain (dashboard, laporan, reminder, notifikasi) otomatis mengabaikan
  sertifikat yang ada di Trash.
- **Dashboard dioptimalkan**: statistik sekarang dihitung lewat `COUNT()` langsung di database,
  bukan memuat seluruh baris sertifikat ke memori lalu dihitung manual — tetap cepat walau data
  sudah ribuan baris.
- **Import massal dari Excel**: halaman `/certificate/import` (Admin only) — unggah file `.xlsx`
  untuk menambahkan banyak sertifikat sekaligus. Sediakan tombol download template, dan
  Kategori/Klien/Divisi yang belum ada otomatis dibuat berdasarkan nama di spreadsheet. Baris
  dengan nomor sertifikat yang sudah ada akan dilewati (tidak menimpa data lama), dan setiap
  baris dilaporkan status individualnya (dibuat/dilewati/error).
- **Rate limiting login**: maksimal 5 percobaan gagal per kombinasi IP+email dalam 15 menit,
  mencegah brute-force password.
- **Validasi environment variable saat startup**: kalau `.env` belum lengkap, aplikasi
  menampilkan pesan jelas ("variable X belum diisi") alih-alih error teknis yang membingungkan.
- **Dark mode**: toggle ikon matahari/bulan di navbar (dan halaman login), tersimpan di
  `localStorage`, tanpa efek "flash" warna terang sesaat sebelum halaman selesai dimuat.
- **Skeleton loading**: tabel sertifikat, audit log, dan notifikasi kini menampilkan placeholder
  animasi saat memuat data, bukan lagi spinner polos di tengah layar.
- **Export PDF diperbaiki**: tabel sekarang punya lebar kolom proporsional (bukan rata sama
  rata) dan border yang rapi di setiap baris/kolom, termasuk untuk laporan yang lebih dari satu
  halaman. Juga ditambahkan `serverExternalPackages: ["pdfkit"]` di `next.config.js` — ini
  memperbaiki bug umum di mana PDFKit gagal menemukan file font bawaannya saat di-bundle Next.js.
- **Template email — mode Sederhana & Lanjutan**: halaman `/email-template` (Admin only) kini
  punya dua mode. **Sederhana** (default): form biasa berisi Nama Perusahaan, Salam Pembuka,
  Paragraf Pembuka/Penutup, Teks Tombol, dan Footer — tabel detail sertifikat (nama, nomor,
  kategori, dst.) otomatis ditampilkan tanpa perlu diatur. **Lanjutan**: textarea HTML mentah
  untuk yang butuh kontrol penuh atas tata letak. Kedua mode punya live preview di sisi kanan dan
  tombol reset ke default masing-masing. Tombol "Lihat Contoh Template" di Dashboard membuka
  preview lengkap di tab baru.
- **Ubah password sendiri** dari halaman Profile (tidak perlu lewat Admin lain).
- **Validasi upload diperketat**: file diverifikasi dari *magic bytes* aslinya, bukan cuma
  ekstensi/MIME type yang bisa dipalsukan.
- **Dashboard KPI lengkap**: breakdown <30/<60/<90 hari (kumulatif), grafik tren bulanan 12
  bulan ke depan, dan widget "Aktivitas Terbaru" (Admin).
- **CC Email**: setiap sertifikat bisa punya email atasan/manager yang otomatis di-CC saat
  reminder terkirim.
- **Bulk actions**: pilih banyak sertifikat sekaligus di halaman Certificate untuk dihapus
  bersamaan (Admin only).


### Manajemen Sertifikat
- CRUD lengkap (Nomor, Nama, Klien, Kategori, Divisi, Instansi Penerbit, PIC & Email PIC,
  Tanggal Terbit/Berlaku/Berakhir, Lokasi Penyimpanan, Deskripsi, Catatan).
- Upload dokumen PDF/JPG/PNG hingga 20 MB dengan preview.
- **Renewal**: riwayat perpanjangan tersimpan permanen, data aktif otomatis ter-update.
- Pencarian, filter (klien/kategori/divisi/status/tahun), sorting, pagination.
- Status dihitung otomatis (Active / Expiring Soon ≤30 hari / Expired).

### Data Pendukung
**Clients**, **Category**, **Departments** — masing-masing dengan CRUD sendiri.

### Auth & Role (Admin / Viewer)
- **Administrator**: akses penuh ke seluruh fitur, termasuk halaman Users & Audit Log.
- **Viewer**: hanya melihat dashboard, data, unduh dokumen, dan histori — tombol ubah data
  disembunyikan di UI *dan* ditolak di API meski URL diakses langsung.
- Halaman **Users** (Admin-only): kelola pengguna & role, dengan proteksi anti-self-lockout.

### Email Reminder
- Milestone: **90, 60, 30, 14, 7, 3, 1 hari** sebelum berakhir, dan **hari-H**.
- Template HTML profesional (logo, detail sertifikat, tombol aksi, footer otomatis).
- Anti-duplikat via tabel `EmailLog` — satu (sertifikat, milestone) hanya terkirim sekali.
- Kartu **Reminder Email** di Dashboard (Admin-only): tombol trigger manual + log terbaru.
- Mode simulasi otomatis jika `GMAIL_USER`/`GMAIL_APP_PASSWORD` kosong (tidak pernah error, hanya mencatat log).
- **Belum ada cron aktif** — lihat bagian *Mengaktifkan Cron* untuk mengaktifkannya.

### Notification Center
- Notifikasi otomatis dibuat untuk setiap sertifikat yang masuk status **Expiring Soon** atau
  **Expired** (disinkronkan setiap kali data notifikasi diambil — tidak perlu cron terpisah).
- Ikon lonceng di Navbar dengan badge jumlah baru, polling tiap 60 detik, dropdown quick-view.
- Halaman penuh `/notifications` dengan tab status: **Baru / Sudah Dibaca / Selesai
  Ditindaklanjuti**, bisa diakses Admin maupun Viewer.

### Audit Log
- Mencatat: login, logout, tambah/ubah/hapus sertifikat, kategori, divisi, klien, pengguna,
  renewal, pengiriman reminder, dan ekspor laporan.
- Halaman `/audit-log` (Admin-only): filter aksi, entitas, pencarian, pagination.
- Penulisan log bersifat *fire-and-forget* — kegagalan mencatat log tidak pernah membatalkan
  aksi utama pengguna.

### Export Laporan
- 6 jenis laporan: **Sertifikat Aktif**, **Akan Berakhir**, **Kedaluwarsa**, **Histori
  Renewal**, **Rekap per Divisi**, **Rekap per Kategori**.
- Setiap laporan bisa diunduh sebagai **Excel (.xlsx)** atau **PDF** dari halaman `/reports`.
- Setiap ekspor tercatat di Audit Log.

### Service Catalog (`/services`, `/document-types`) — Phase 4
- **`Service`**: master layanan sertifikasi — nama, kode, deskripsi, estimasi hari proses,
  butuh audit?, butuh surveillance? (+ jumlah & interval bulan jika ya).
- **`DocumentType`**: master jenis dokumen yang dipakai ulang lintas layanan (mis. "NIB",
  "Legal Document") — dikelola terpisah di `/document-types`.
- **`ServiceRequirement`**: persyaratan dokumen per layanan (wajib/opsional, tipe file yang
  diterima, ukuran maks, urutan tampil) — dikelola dari halaman detail tiap layanan.
- **`WorkflowStage`**: tahap-tahap proses sertifikasi per layanan (nama, tipe tahap, urutan,
  SLA hari, PIC role, visibilitas & deskripsi untuk klien) — **sepenuhnya data-driven**,
  bukan `if service == "X"` di kode, sesuai prinsip inti sistem ini.
- Klien melihat versi read-only di **Katalog Layanan** (`/portal/services`): deskripsi,
  daftar dokumen yang perlu disiapkan, dan alur proses (hanya tahap yang ditandai
  "tampilkan ke klien").

### Client Portal (`/portal`) — Fondasi
- **Login terpisah** dari sisi internal — cookie session, identity model (`ClientUser`), dan
  middleware sendiri. Tidak pernah tercampur dengan sesi Admin/Viewer.
- **Dashboard klien**: ringkasan status sertifikat milik perusahaannya sendiri (Aktif/Akan
  Berakhir/Kedaluwarsa), daftar "Perlu Perhatian".
- **Sertifikat Saya**: daftar lengkap + lihat/download dokumen (lewat proxy yang sama dengan
  sisi internal, dengan verifikasi kepemilikan — klien A tidak bisa akses dokumen klien B).
- **Katalog Layanan**: lihat layanan sertifikasi yang tersedia, persyaratan dokumen, dan alur
  prosesnya (lihat bagian Service Catalog di atas).
- **Pengajuan Sertifikasi** (`/portal/applications`): klien mengajukan sertifikasi baru, upload
  dokumen per checklist, lihat status & catatan revisi dari reviewer — lihat bagian Application
  di atas.
- **Admin mengelola akun portal** klien dari halaman `/clients` — tombol kunci di tiap kartu
  klien untuk tambah/edit/nonaktifkan/hapus akun login klien tersebut.
- Widget "Jadwal Surveillance" masih berupa placeholder jujur — fitur ini termasuk fase
  pengembangan berikutnya (Workflow Tracking, Certificate Issuance, Surveillance) yang belum
  dibangun.

## Struktur Folder

```text
certificate-reminder/
├── prisma/
│   ├── schema.prisma   # User(role), Category, Department, Client, Certificate, Renewal,
│   │                   # EmailLog, AuditLog, Notification
│   └── seed.ts          # 1 admin, 1 viewer, 7 kategori, 5 divisi, 6 klien, 20 sertifikat, 1 renewal
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/                     # Route group terautentikasi (dengan sidebar)
│   │   │   ├── dashboard/             # + Reminder Center (admin only)
│   │   │   ├── certificate/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   ├── clients/, category/, departments/
│   │   │   ├── users/                 # Admin only
│   │   │   ├── audit-log/             # Admin only
│   │   │   └── profile/
│   │   └── api/
│   │       ├── auth/login, auth/logout
│   │       ├── certificates, certificates/[id], certificates/[id]/renewals
│   │       ├── clients, categories, departments, users   (mutasi = admin only)
│   │       ├── notifications, notifications/[id], notifications/mark-all-read
│   │       ├── reports/export         # ?type=...&format=xlsx|pdf
│   │       ├── audit-log              # Admin only
│   │       ├── upload
│   │       └── reminders/run          # Manual trigger (admin) atau cron (CRON_SECRET)
│   ├── components/
│   │   ├── ui/, layout/ (+ NotificationBell), certificate/, client/, category/, department/,
│   │   │   user/, dashboard/ (+ ReminderCenter), notification/, audit/
│   ├── lib/
│   │   ├── prisma.ts, auth.ts, status.ts, validations.ts, certificate-payload.ts
│   │   ├── email.ts, reminder.ts        # Email Reminder
│   │   ├── notifications.ts             # Notification Center
│   │   ├── audit.ts                     # Audit Log
│   │   ├── reports.ts, excel-report.ts, pdf-report.ts   # Export Laporan
│   ├── middleware.ts       # Auth guard + role-based page redirect
│   └── types/
└── public/uploads/
```

## Instalasi

**Prasyarat:** Node.js 18.18+ dan npm, project Supabase (PostgreSQL), project Google Cloud
dengan Drive API (untuk penyimpanan dokumen).

```bash
cd certificate-reminder
npm install
cp .env.example .env
# Ubah SESSION_SECRET menjadi string acak yang panjang & rahasia.
# Isi DATABASE_URL & DIRECT_URL dengan connection string Supabase Anda.
# Isi GOOGLE_SERVICE_ACCOUNT_KEY & GOOGLE_DRIVE_FOLDER_ID — lihat bagian
# "Setup Google Drive" di bawah untuk cara mendapatkannya.
```

### Instalasi baru

```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### Upgrade dari versi sebelumnya (skema berubah — PostgreSQL, ClientUser, driveFileId, dll.)

Karena provider database berubah dari SQLite ke PostgreSQL, migration history lama tidak bisa
dipakai lagi — hapus dan buat ulang dari nol terhadap database Postgres Anda:

```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init_postgres
npx prisma db seed
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk portal internal, atau
[http://localhost:3000/portal/login](http://localhost:3000/portal/login) untuk Client Portal.

## Setup Google Drive (penyimpanan dokumen)

Aplikasi ini menyimpan dokumen sertifikat/renewal di Google Drive, bukan di server itu sendiri.
Tanpa konfigurasi ini, fitur upload dokumen tidak akan berfungsi — fitur lain tetap berjalan.

**1. Buat Google Cloud Project & aktifkan Drive API**
- Buka [console.cloud.google.com](https://console.cloud.google.com), buat project baru
- Menu **APIs & Services → Enable APIs and Services** → cari **"Google Drive API"** → **Enable**

**2. Buat Service Account & unduh key JSON**
- Menu **APIs & Services → Credentials → Create Credentials → Service Account**
- Buka service account yang baru dibuat → tab **Keys** → **Add Key → Create new key** → **JSON**

**3. Buat folder di Google Drive & bagikan ke service account**
- Buat folder baru (mis. "Certificate Reminder - Dokumen")
- Klik kanan → **Share** → tempel email service account (field `client_email` di file JSON,
  bentuknya `nama@project.iam.gserviceaccount.com`) → akses **Editor**
- Salin **folder ID** dari URL: `drive.google.com/drive/folders/`**`INI_FOLDER_ID_NYA`**

**4. Isi `.env`**
```
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account", ...seluruh isi file JSON...}'
GOOGLE_DRIVE_FOLDER_ID="folder_id_dari_langkah_3"
```
Kalau tanda kutip JSON bermasalah di shell/hosting Anda, encode dulu ke base64 (kode otomatis
mendeteksi & mendecode base64):
```bash
# Mac/Linux
base64 -i nama-file-key.json | tr -d '\n'
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("nama-file-key.json"))
```

> **Keamanan**: dokumen di Drive **tidak** dibuat publik. Pengguna (internal maupun Client
> Portal) mengakses dokumen lewat `/api/files/[fileId]`, yang mensyaratkan login terlebih
> dahulu — dan untuk Client Portal, hanya dokumen milik klien yang bersangkutan yang bisa
> diakses (diverifikasi lewat database sebelum meneruskan permintaan ke Drive).

## Cara Login

**Internal** ([http://localhost:3000/login](http://localhost:3000/login)):
```
Administrator : admin@certificatereminder.id  / admin123
Viewer (demo) : viewer@certificatereminder.id / viewer123
```

**Client Portal** ([http://localhost:3000/portal/login](http://localhost:3000/portal/login)):
```
Klien (demo) : portal@nusantarapangan.co.id / portal123
```

> Ganti semua password ini sebelum digunakan di lingkungan produksi.

## Mengaktifkan Email Reminder Sungguhan

Dikirim lewat SMTP Gmail Anda sendiri — tidak perlu verifikasi domain, tapi dibatasi ~500
email/hari (akun Gmail gratis) dan selalu terkirim dari alamat Gmail asli Anda, bukan domain
perusahaan.

1. Aktifkan **2-Step Verification** di akun Google Anda: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Buat **App Password** khusus (bukan password Gmail biasa — Google sudah tidak mengizinkan
   itu untuk SMTP): [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Isi di `.env`:
   ```
   GMAIL_USER="nama.anda@gmail.com"
   GMAIL_APP_PASSWORD="16_karakter_dari_langkah_2"
   EMAIL_FROM_NAME="Certificate Reminder - PT Sucofindo (Persero)"
   APP_URL="https://domain-produksi-anda.com"
   ```
4. Restart server. Isi field **Email PIC** di setiap sertifikat — reminder hanya terkirim kalau
   field ini diisi.

> **Kalau nanti punya domain perusahaan sendiri** (mis. `sucofindo.co.id`) dan ingin email
> terkirim dari alamat itu (bukan `@gmail.com`), gunakan penyedia email transaksional seperti
> Resend/SendGrid yang mendukung verifikasi domain — butuh akses ke pengaturan DNS domain
> tersebut.

### Mengaktifkan Cron (pengecekan otomatis harian)

**Opsi A — Vercel Cron**: tambahkan `vercel.json` di root project:
```json
{ "crons": [{ "path": "/api/reminders/run", "schedule": "0 1 * * *" }] }
```
Isi `CRON_SECRET` di environment variables Vercel untuk mengamankan endpoint (periksa dokumentasi
Vercel Cron terbaru untuk cara header otentikasinya dikirim).

**Opsi B — crontab di VPS/server biasa**:
```bash
0 8 * * * curl -s -X POST https://domain-anda.com/api/reminders/run \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Opsi C — manual**: tombol "Kirim Reminder Sekarang" di Dashboard (Admin).

## Database & Migration

- Skema di `prisma/schema.prisma`. Setelah mengubahnya, jalankan
  `npx prisma migrate dev --name <deskripsi>`.
- Lihat/ubah data visual: `npx prisma studio`.
- Reset total + seed ulang: `npx prisma migrate reset`.

## Build untuk Produksi

```bash
npm run build
npm run start
```

`npm run build` sekarang otomatis menjalankan `prisma generate` dan `prisma migrate deploy`
sebelum `next build` — jadi migration database ikut diterapkan setiap kali build dijalankan
(termasuk saat deploy ke Vercel), tanpa langkah manual tambahan.

> **Catatan PDFKit**: generator PDF (`lib/pdf-report.ts`) menggunakan font standar bawaan PDF
> (Helvetica) sehingga tidak butuh file font tambahan. Pastikan target deployment menjalankan
> runtime Node.js standar untuk API routes (bukan Edge Runtime), karena PDFKit memerlukan akses
> filesystem Node.js saat membaca metrik font internalnya. Route yang butuh ini
> (`/api/upload`, `/api/files/[fileId]`, `/api/reports/export`, `/api/certificates/import*`)
> sudah ditandai `export const runtime = "nodejs"` secara eksplisit di kodenya.

### Deploy ke Vercel (Hobby)

1. **Push project ke GitHub**, lalu import ke [vercel.com](https://vercel.com) sebagai project baru.
2. **Isi Environment Variables** di Project Settings → Environment Variables (samakan dengan
   `.env` lokal Anda): `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`,
   `CRON_SECRET`. Untuk `APP_URL`, isi dengan domain Vercel Anda setelah deploy pertama
   (mis. `https://nama-project.vercel.app`), lalu redeploy sekali agar link di email reminder
   mengarah ke domain yang benar.
3. **Deploy**. Build pertama akan otomatis membuat seluruh tabel di database Supabase Anda
   (lewat `prisma migrate deploy` di build script). Setelah itu, jalankan seed **sekali** dari
   komputer lokal Anda (bukan dari Vercel) dengan `DATABASE_URL`/`DIRECT_URL` produksi di
   `.env` lokal: `npx prisma db seed`.
4. **`vercel.json`** sudah disertakan untuk menjadwalkan `/api/reminders/run` sekali sehari —
   ini sudah disesuaikan dengan batas plan **Hobby** (maksimal 1x/hari, waktu tidak presisi,
   bisa meleset dalam rentang 1 jam). Kalau nanti upgrade ke Pro, jadwal bisa dipercepat/lebih
   presisi dengan mengubah `schedule` di `vercel.json`.

**Batasan plan Hobby yang perlu diperhatikan** (karena sistem ini dipakai sebagai aplikasi
internal perusahaan, bukan proyek pribadi):
- Plan Hobby resminya untuk pemakaian personal/non-komersial — pertimbangkan upgrade ke **Pro**
  begitu sistem ini benar-benar dipakai operasional oleh PT Sucofindo.
- Timeout function default 60 detik — cukup untuk upload dokumen, export laporan, dan
  reminder harian pada skala data saat ini, tapi perlu dipantau kalau data sudah sangat besar.
- Kuota Active CPU 4 jam/bulan — cukup untuk pemakaian ringan-menengah; kalau makin banyak
  staf yang mengakses rutin, ini bisa jadi alasan utama untuk upgrade ke Pro.

## Roadmap Selanjutnya

Sistem ini telah berkembang menjadi **Certification Application, Tracking & Certificate
Management System** yang utuh — seluruh **9 fase** dari spesifikasi awal sudah dibangun:

- ~~Phase 1-2 — Foundation & Certificate Reminder~~ **✅ Selesai**
- ~~Phase 3 — Client Portal~~ **✅ Selesai**
- ~~Phase 4 — Service Catalog~~ **✅ Selesai**
- ~~Phase 5 — Application~~ **✅ Selesai**
- ~~Phase 6 — Tracking~~ **✅ Selesai**
- ~~Phase 7 — Certificate Issuance~~ **✅ Selesai**
- ~~Phase 8 — Surveillance~~ **✅ Selesai** *(catatan: reminder email surveillance belum ada —
  saat ini hanya tampil di Dashboard Portal, belum dikirim via email seperti reminder
  sertifikat)*
- ~~Phase 9 — Reporting~~ **✅ Selesai**

### Kemungkinan penyempurnaan lanjutan (di luar 9 fase awal)

- **Reminder email untuk surveillance** — kirim email H-30/H-7 sebelum jadwal surveillance,
  meniru pola reminder sertifikat yang sudah ada.
- **Notifikasi email untuk event Application** — saat ini Notification Center hanya mencakup
  sertifikat; event seperti "Dokumen Perlu Revisi" atau "Sertifikat Diterbitkan" belum memicu
  email/notifikasi otomatis ke klien (klien harus cek portal secara manual).
- **Dashboard Internal untuk Application/Surveillance** — Dashboard saat ini masih fokus ke
  Certificate; bisa ditambah ringkasan "Permohonan Baru", "Perlu Direview", "Surveillance
  Terlambat" di satu tempat.
- **Multi-dokumen per requirement** — saat ini satu `ServiceRequirement` hanya menyimpan
  dokumen versi terbaru per aplikasi; lampiran pendukung tambahan belum didukung.
- Item infrastruktur dari sebelumnya (belum krusial): Supabase Storage sebagai redundansi
  Google Drive, migrasi ke NextAuth/Auth.js jika suatu saat perlu SSO.

Item infrastruktur yang masih relevan:
- **Supabase Storage** untuk backup/redundansi dokumen selain Google Drive (opsional).
- **NextAuth/Auth.js**: bisa menggantikan sistem auth saat ini (JWT+bcrypt+role) tanpa mengubah
  struktur `role` yang sudah ada di model `User`/`ClientUser`, jika suatu saat perlu SSO/OAuth.
- **Dark Mode** dan komponen UI tambahan (skeleton loading, drawer) — sudah ada di sisi
  internal, belum sepenuhnya konsisten di Client Portal.
