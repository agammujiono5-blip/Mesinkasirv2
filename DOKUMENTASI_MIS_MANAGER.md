# DOKUMENTASI SISTEM INFORMASI MANAJEMEN (MIS) KASIRPRO
## Fokus Peran: User Manager / Eksekutif Perusahaan
### Berbasis Integrasi Tiga Pilar: TPS (Transaction Processing System), OAS (Office Automation System), dan KMS (Knowledge Management System)

---

## 1. Pendahuluan & Latar Belakang

Sistem Informasi Manajemen (**Management Information System / MIS**) adalah sistem informasi terintegrasi pada level manajerial yang mengolah data operasional mentah dari berbagai sub-sistem organisasi menjadi informasi ringkas, akurat, dan bernilai strategis.

Berbeda dari kasir yang hanya berfokus pada kecepatan input transaksi individual, atau staf gudang yang berfokus pada pencatatan fisik barang, seorang **Manager** bertanggung jawab atas:
1. **Pengendalian Kinerja Operasional & Finansial** (Penjualan, arus kas, margin laba, dan efisiensi stok).
2. **Koordinasi & Efisiensi Administrasi Perkantoran** (Disposisi pengadaan/restok, absensi staf, alur kerja tanpa kertas, dan pemenuhan SLA).
3. **Standarisasi Kualitas & Modal Pengetahuan Organisasi** (Kepatuhan terhadap SOP, pelatihan berkelanjutan staf, serta kecepatan penyelesaian masalah di lapangan).

Untuk memenuhi kebutuhan tersebut, Front End MIS ini dibangun secara khusus bagi **User Manager** dengan mengintegrasikan data dari **tiga sistem sumber utama**:
* **TPS (Transaction Processing System)**
* **OAS (Office Automation System)**
* **KMS (Knowledge Management System)**

---

## 2. Arsitektur Piramida Sistem Informasi Perusahaan

Dalam teori sistem informasi bisnis (Laudon & Laudon), hierarki sistem digambarkan dalam piramida organisasi sebagai berikut:

```
                  ┌────────────────────────┐
                  │          ESS           │  Level Strategis (Direksi/Owner)
                  ├────────────────────────┤
                  │     ★ MIS / DSS ★      │  Level Taktis & Manajerial (MANAGER)
                  │ (Integrasi TPS-OAS-KMS)│
                  ├────────────────────────┤
                  │     OAS   │   KMS      │  Level Pengetahuan & Administrasi
                  ├───────────┴────────────┤
                  │          TPS           │  Level Operasional Harian
                  └────────────────────────┘
```

MIS bertindak sebagai **jembatan analitis** yang menghisap data transaksi bervolume tinggi dari TPS, data administratif dari OAS, serta pedoman mutu dan kompetensi dari KMS, kemudian menyajikannya dalam satu **Executive Management Cockpit**.

---

## 3. Integrasi Tiga Pilar Database ke dalam MIS Manager

### A. TPS (Transaction Processing System) — Pilar Transaksional & Finansial
TPS menangani transaksi harian bernilai kritis pada kasir dan kas toko:
* **Entitas Sumber**: Tabel `transaksi`, `detail_transaksi`, `pembelian`, `barang`, `stok_log`.
* **Transformasi Informasi ke Dashboard MIS**:
  1. **Total Revenue & Gross Profit**: Menghitung omset bruto dan laba kotor melalui formula `Penjualan - Pembelian (COGS)` dengan persentase margin laba.
  2. **Average Order Value (AOV)**: Rata-rata nilai belanja per pelanggan untuk mengukur daya beli dan efektivitas promosi.
  3. **Kecepatan Checkout Kasir**: Mengukur waktu rata-rata pemrosesan tiap transaksi (detik/transaksi) untuk mencegah antrean panjang.
  4. **Komposisi Metode Pembayaran**: Melacak adopsi non-tunai (QRIS Dinamis, Transfer Bank, Uang Tunai, Debit/Kredit).
  5. **Analisis Produk Pareto (80/20 Rule)**: Mengidentifikasi 20% SKU produk yang menghasilkan 80% omset perusahaan, lengkap dengan sisa stok dan risiko kehabisan barang (*stockout*).
  6. **Inventory Turnover Ratio**: Mengukur berapa kali persediaan barang terjual dan tergantikan dalam suatu periode.

### B. OAS (Office Automation System) — Pilar Administrasi & Workflow
OAS mengotomatiskan tugas-tugas administratif rutin kantor, koordinasi antar divisi, dan rantai persetujuan (*approval chain*):
* **Entitas Sumber**: Sistem persetujuan pengadaan digital, mesin absensi shift biometrik, log penugasan, dan memo sirkular internal.
* **Transformasi Informasi ke Dashboard MIS**:
  1. **Workflow Persetujuan Pengadaan (Purchase Requisition / PR Approval)**:
     - Mengumpulkan usulan restok dari staf gudang sebelum diteruskan menjadi Purchase Order ke supplier.
     - **Interaksi Manager Langsung**: Manager dapat menyetujui (*Approve*) atau menolak (*Reject*) disposisi pengadaan langsung dari dashboard dengan memberikan catatan otorisasi.
  2. **Monitoring Kehadiran & Kedisiplinan Staf (Staff Shift Adherence)**:
     - Persentase kehadiran harian tim operasional (kasir, supervisor, staf gudang, back office).
     - Rincian status: Tepat waktu, terlambat, izin sakit, atau cuti.
  3. **Efisiensi Administrasi Tanpa Kertas (Paperless Document SLA)**:
     - Jumlah dokumen digital yang diproses (faktur digital, berita acara stock opname, formulir serah terima kas register).
     - Rasio pemenuhan tenggat waktu tugas administratif (*Task SLA Compliance Rate*).
  4. **Distribusi Memo Internal Eksekutif**:
     - Media bagi Manager untuk menyiarkan instruksi kerja operasional (misal: persiapan promo Harbolnas, audit akhir pekan) dan memantau persentase keterbacaan oleh staf.

### C. KMS (Knowledge Management System) — Pilar Mutu & Modal Pengetahuan
KMS mengelola modal intelektual, standarisasi prosedur kerja, pelatihan staf, dan efisiensi penyelesaian kendala di lapangan:
* **Entitas Sumber**: Repositori SOP digital, log audit kepatuhan, modul kuis pelatihan staf, serta basis pengetahuan troubleshooting kendala kasir.
* **Transformasi Informasi ke Dashboard MIS**:
  1. **Repositori Dokumen SOP & Kepatuhan Audit (Audit Compliance Rate)**:
     - Menyediakan SOP resmi per divisi: `SOP-KSR-001` (Standar Pelayanan Kasir), `SOP-GDG-002` (Inspeksi Gudang & FIFO), `SOP-FIN-003` (Closing Shift & Rekonsiliasi Settlement), `SOP-CS-004` (Penanganan Retur & Komplain).
     - Melacak persentase kepatuhan staf hasil audit fisik berkala.
     - **Fitur Interaktif**: Manager dapat membuka modal detail untuk memeriksa tahapan langkah kerja SOP dan riwayat audit.
  2. **Modul Pelatihan & Matriks Kompetensi Karyawan**:
     - Rasio penyelesaian pelatihan oleh staf operasional (*Training Completion Rate*).
     - Rata-rata skor kuis kompetensi (cth: modul deteksi uang palsu, transaksi non-tunai, FIFO).
  3. **First-Contact Resolution (FCR) & Basis Pengetahuan Troubleshooting**:
     - Persentase kendala teknis/operasional kasir yang berhasil diselesaikan mandiri oleh staf menggunakan panduan KMS tanpa eskalasi berlarut ke supervisor.
     - Analisis kata kunci pencarian FAQ terbanyak (cth: *Time-out QRIS*, *Barcode rusak*, *Koreksi selisih kas*).
     - Fitur pencarian interaktif basis pengetahuan untuk simulasi penyelesaian insiden.

---

## 4. Indeks Kesehatan Bisnis (Corporate Health Score)

Dashboard MIS Manager dilengkapi dengan algoritma penghitungan **Corporate Balanced Health Index** (skala 0–100) yang menggabungkan ketiga pilar secara berimbang:

$$\text{Health Score} = (0.40 \times \text{Skor TPS}) + (0.30 \times \text{Skor OAS}) + (0.30 \times \text{Skor KMS})$$

* **Bobot TPS (40%)**: Merefleksikan margin laba kotor, pertumbuhan omset, dan efisiensi kecepatan kasir.
* **Bobot OAS (30%)**: Merefleksikan tingkat kehadiran staf, kedisiplinan shift, dan kecepatan penyelesaian disposisi administrasi.
* **Bobot KMS (30%)**: Merefleksikan rata-rata kepatuhan audit SOP, nilai kompetensi SDM, dan tingkat First-Contact Resolution (FCR).

### Kategori Status:
* **PRIMA (85 - 100)**: Seluruh lini bisnis berjalan optimal, kepatuhan tinggi, keuangan sehat.
* **WASPADA (70 - 84)**: Terdapat ketidakseimbangan (misal: omset tinggi namun disiplin administrasi atau kepatuhan SOP menurun).
* **KRITIS (< 70)**: Memerlukan intervensi perbaikan manajerial darurat.

---

## 5. Kecerdasan Keputusan Manajerial (Cross-System Decision Support)

Keunggulan utama dari integrasi TPS, OAS, dan KMS adalah kemampuan memberikan **rekomendasi keputusan manajerial cerdas** yang menghubungkan titik-titik data lintas pilar:

| ID Insight | Pilar Terkoneksi | Temuan Data Lintas Sistem | Rekomendasi Tindakan untuk Manager | Estimasi Dampak Bisnis |
|:---|:---|:---|:---|:---|
| **INS-01** | **TPS + OAS** | Penjualan Kopi Arabika menyumbang **24.5% omset** di TPS, namun sisa stok tersisa **18 pack** (kritis). Di OAS ada disposisi **PR-2026-081** dari kepala gudang yang menunggu approval Manager. | **Segera Setujui (Approve)** pengajuan pengadaan PR-2026-081 senilai Rp 4.200.000 via tombol aksi OAS. | Mencegah risiko kehabisan stok (*stockout*) dan potensi kehilangan omset Rp 9.500.000 pada akhir pekan. |
| **INS-02** | **TPS + KMS** | Tren metode pembayaran di TPS menunjukkan **44% transaksi menggunakan QRIS Dinamis**. Di KMS, artikel penanganan time-out transaksi QRIS dibaca 68 kali dengan FCR 94%. | Pertahankan SOP-KSR-001 dan selenggarakan pelatihan modul 101 untuk kasir baru. | Mempercepat antrean kasir sebesar 15% dan meniadakan selisih rekonsiliasi settlement EDC. |
| **INS-03** | **OAS + KMS** | Tingkat kehadiran staf di OAS mencapai **94.4% tepat waktu**, sejalan dengan tingginya skor audit SOP Kasir (**96%**) dan akurasi register kasir Siti Rahmawati (**99.4%**). | Terbitkan memo penghargaan dan berikan insentif bulanan staf berprestasi. | Meningkatkan moral kerja, retensi karyawan toko, dan menekan turnover SDM. |

---

## 6. Fitur-Fitur Front End untuk User Manager

Halaman Front End MIS (`frontend/src/pages/admin/MisManager.tsx`) menyediakan fungsionalitas komprehensif bagi Manager:

1. **Preset Login Cepat Role Manager**:
   - Pada halaman `Login.tsx`, tersedia tombol sekali klik **"Akun Manager"** (`manager / password123`).
   - Saat login sebagai Manager, sistem otomatis mengarahkan ke halaman MIS Executive.
2. **Filter Rentang Waktu Dinamis**:
   - Pilihan filter: `Hari Ini (Live)`, `7 Hari Terakhir`, `30 Hari Terakhir` (default), dan `Kuartal Q3`.
   - Seluruh metrik TPS, OAS, dan KMS diperbarui secara proporsional sesuai periode yang dipilih.
3. **Tab Navigasi Khusus**:
   - **Tab 1 - Ringkasan Eksekutif (Tri-System)**: Balanced scorecard, kartu rekomendasi keputusan lintas sistem, dan arsitektur modul.
   - **Tab 2 - Kinerja TPS**: Omset, laba kotor, AOV, grafik tren harian vs target, distribusi pembayaran, evaluasi produktivitas tiap kasir, dan ranking produk Pareto.
   - **Tab 3 - Kinerja OAS**: Disposisi persetujuan pengadaan barang (dengan tombol interaktif *Approve* & *Reject*), monitoring shift kasir & gudang, serta memo internal eksekutif.
   - **Tab 4 - Kinerja KMS**: Repositori SOP resmi, skor audit kepatuhan, modul training staf, First-Contact Resolution, dan fitur pencarian artikel troubleshooting KB interaktif.
4. **Modal Interaktif Detail SOP**:
   - Mengklik kartu SOP membuka lembar dokumen lengkap yang mencakup divisi, penanggung jawab, versi, skor audit, dan daftar tahapan kerja standar.
5. **Cetak & Ekspor Laporan Resmi Eksekutif MIS**:
   - Tombol **"Cetak Laporan MIS"** memunculkan lembar laporan resmi berformat kop surat eksekutif yang merangkum metrik ketiga pilar, dilengkapi lembar pengesahan tanda tangan digital Manager dan tombol cetak/PDF (`window.print()`).
6. **Sinkronisasi 100% dengan Admin Dashboard & Database MySQL (`dbtugasmg`)**:
   - Backend menyediakan endpoint khusus `/api/dashboard/executive` yang terhubung langsung ke database MySQL yang sama dengan `/api/dashboard/stats` pada Admin Dashboard.
   - **Tingkat Akurasi Metrik Terpadu**:
     * **Penjualan Hari Ini & Bulan Ini**: Nilai pada Dasbor Admin dan MIS Manager identik hingga digit satuan Rupiah.
     * **Stok Kritis / Menipis**: Keduanya mendeteksi produk yang sama (cth: *Tas Ransel Laptop Waterproof* kode `BRG-010`, stok sisa 2 unit dari batas minimum 5 unit).
     * **Produk Pareto / Terlaris**: Urutan Top 5 produk terlaris di Dasbor Admin dan Tab TPS Manager identik secara real-time (*1. Kopi Arabika Premium 250g [43 unit], 2. Buku Catatan Hardcover A5 [25 unit], 3. Mechanical Keyboard RGB TKL [17 unit], 4. Wireless Mouse Ergonomic [15 unit], 5. Kaos Polos Cotton Combed 30s [11 unit]*).
     * **Daftar Kasir & Metode Bayar**: Diambil langsung dari relasi tabel `transaksi` dan `users` (Kasir Utama: 25 transaksi senilai Rp 12.845.000; Administrator: 5 transaksi senilai Rp 2.340.000; QRIS Dinamis menyumbang 49% omset).
   - **Bebas dari Data Dummy**: Seluruh fungsi mock lokal dan data dummy telah dibersihkan secara total. Seluruh kartu analitik, grafik, tabel produk Pareto, daftar rekomendasi restok (OAS), dan repositori SOP/Knowledge Base (KMS) bersumber 100% murni dari tabel-tabel di database MySQL `dbtugasmg`.
   - **Interaksi Approval Terhubung Langsung ke MySQL**: Tombol persetujuan/penolakan restok barang pada tab OAS langsung mengeksekusi query pembaruan ke tabel `rekomendasi_restock` melalui endpoint `PUT /api/dashboard/rekomendasi/{id}`.

---

## 7. Panduan Menjalankan Front End

### Prasyarat:
* Node.js versi 18 atau lebih baru.
* Web browser modern (Chrome, Safari, Edge, atau Firefox).

### Langkah Menjalankan:
1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pastikan paket dependensi terpasang:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan Vite:
   ```bash
   npm run dev
   ```
4. Buka URL yang ditampilkan di terminal (biasanya `http://localhost:5173`).
5. Pada halaman Login:
   - Klik tombol **"Akun Manager"** (Username: `manager`, Password: `password123`).
   - Klik tombol **"Masuk sebagai Manager (Executive MIS)"**.
   - Anda akan langsung disambut oleh **Pusat Kendali MIS Manager** yang terintegrasi penuh.

---

## 8. Kesimpulan

Dengan menggabungkan database **TPS** (fakta transaksional operasional), **OAS** (alur birokrasi & kedisiplinan kerja), dan **KMS** (standarisasi pengetahuan & mutu), Front End MIS ini mentransformasikan data terisolasi (*siloed data*) menjadi **satu kesatuan wawasan bisnis holistik**.

Hal ini memungkinkan User Manager untuk beralih dari manajemen yang bersifat *reaktif* (menunggu masalah terjadi) menjadi manajemen yang **proaktif dan berbasis data (*data-driven decision making*)**.
