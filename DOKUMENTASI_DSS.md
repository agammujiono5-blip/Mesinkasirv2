# DOKUMENTASI MODUL DSS (Decision Support System)
## KasirPro — Lanjutan Integrasi TPS + OAS + KMS → MIS → DSS
### Metode: SAW (Simple Additive Weighting) — Kasus: Prioritas Restok Barang

---

## 1. Ringkasan Eksekutif

Modul **DSS** ditambahkan sebagai kelanjutan langsung dari sistem yang sudah ada **tanpa membuat project baru** dan **tanpa menghapus/mengganti kode existing**. DSS membaca data nyata dari empat modul yang sudah berjalan, menghitung prioritas dengan metode SAW, menampilkan rekomendasi keputusan, dan menyimpan riwayat analisis.

| Aspek | Nilai |
|:---|:---|
| Backend | Laravel **13.29.0**, PHP **8.4.7** |
| Database | MySQL **dbtugasmg** (XAMPP), 26 tabel |
| Frontend | React **19** + TypeScript + Vite **8** + Tailwind **4** |
| Autentikasi | Laravel Sanctum (Bearer Token) — dipakai ulang, tidak diubah |
| Otorisasi | Middleware `role:admin,owner,manager` existing |
| Metode DSS | SAW (benefit & cost), bobot 35/25/20/20 |
| Domain kasus | **Prioritas restok barang** (domain nyata project POS), bukan pengadaan fasilitas kampus |

---

## 2. Arsitektur Project yang Ditemukan (Hasil Audit)

### 2.1 Struktur
```
TugasManajemenSisteminformasi/
├── backend/     → Laravel 13 REST API (Sanctum) + MySQL dbtugasmg
├── frontend/    → React 19 SPA (Vite + Tailwind 4), proxy /api → :8000
├── postman_collection.json + generate_postman.js
└── DOKUMENTASI_MIS_MANAGER.md
```

### 2.2 Pola arsitektur backend (diikuti oleh DSS)
```
routes/api.php
   └─ Controller (extends BaseApiController)
        └─ Service (business logic)
             └─ Model (Eloquent) / DB facade
```
- Response standar: `{ success, message, data }` via `BaseApiController::sendResponse()`.
- Semua route terproteksi di dalam `Route::middleware('auth:sanctum')`.
- Otorisasi per-aksi memakai `Route::middleware('role:...')` (`CheckRole`).
- Primary key non-konvensional: `id_user`, `id_barang`, `id_transaksi`, dst.

### 2.3 Modul existing yang diperiksa

| Modul | Implementasi nyata | Status |
|:---|:---|:---|
| **TPS** | `transaksi`, `detail_transaksi`, `pembelian`, `detail_pembelian`, `barang`, `stok_log`; `TransaksiController`, `PembelianController`, `BarangController`, `StokLogController` | Berfungsi |
| **OAS** | `rekomendasi_restock` (disposisi restok) + endpoint `PUT /api/dashboard/rekomendasi/{id}`; `stok_log` sebagai audit | Berfungsi |
| **KMS** | `knowledge_base` (7 artikel SOP/Troubleshooting/Tips) ditampilkan di `MisManager.tsx` | Berfungsi |
| **MIS** | `DashboardService::getExecutiveStats()`, `GET /api/dashboard/executive`, halaman `MisManager.tsx` (4 tab) | Berfungsi |
| Dashboard admin | `GET /api/dashboard/stats`, `/chart`; `pages/admin/Dashboard.tsx` | Berfungsi |
| Kasir | `pages/Kasir.tsx`, `POST /api/transaksi` | Berfungsi |
| Auth | `AuthController`, `AuthService`, `User` (Sanctum), `Login.tsx` | Berfungsi |

### 2.4 Temuan penting saat audit (didokumentasikan, tidak diubah)

> **Catatan teknis (pre-existing, di luar ruang lingkup DSS):**
> Tabel `knowledge_base`, `laporan_manajemen`, `rekomendasi_restock`, dan `analisis_penjualan` **ada di database MySQL** tetapi **tidak memiliki file migration** di repo. Akibatnya, `GET /api/dashboard/executive` akan gagal (500) pada database yang baru dimigrasi dari nol, meskipun berjalan normal pada `dbtugasmg` saat ini.
> **Tindakan:** DSS dibuat **defensif** — setiap akses tabel dibungkus `Schema::hasTable()` sehingga DSS tetap berjalan dan melaporkan status `tidak_tersedia` alih-alih error. Modul MIS existing **tidak diubah** sesuai instruksi.

### 2.5 Baseline pengujian sebelum perubahan
```
php artisan test   → 2 passed
npm run build      → sukses
```

---

## 3. Rencana Integrasi DSS (dan realisasinya)

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│   TPS   │  │   OAS   │  │   KMS   │
│transaksi│  │restock  │  │knowledge│
│detail   │  │stok_log │  │_base    │
│barang   │  │         │  │         │
└────┬────┘  └────┬────┘  └────┬────┘
     └────────────┼────────────┘
                  ▼
           ┌─────────────┐
           │     MIS     │  laporan_manajemen + analisis_penjualan
           │  (existing) │  GET /api/dashboard/executive
           └──────┬──────┘
                  ▼
     ┌───────────────────────────┐
     │  DSS — SawService         │  Rij & Vi
     │  DssDataService (baca)    │  ← tidak menduplikasi tabel
     │  DssService (orkestrasi)  │
     └───────────────────────────┘
                  ▼
        /api/dss/*  +  DssDashboard.tsx
```

**Prinsip integrasi:** DSS **tidak menyalin** data TPS/OAS/KMS/MIS. DSS hanya menyimpan **hasil keputusan** (snapshot) agar dapat diaudit ulang.

---

## 4. Kriteria & Metode SAW

### 4.1 Kriteria (domain: prioritas restok barang)

| Kode | Kriteria | Bobot | Jenis | Satuan | Sumber Data |
|:---|:---|:---:|:---:|:---|:---|
| C1 | Urgensi Kebutuhan Stok | 35% | benefit | poin 0–100 | TPS (`barang.stok`, `stok_minimum`) + laju jual |
| C2 | Tingkat Permintaan | 25% | benefit | unit | TPS (`detail_transaksi.jumlah`) |
| C3 | Estimasi Biaya Pengadaan | 20% | **cost** | rupiah | TPS (`barang.harga_beli` × jumlah restok OAS) |
| C4 | Dampak Layanan & Pendapatan | 20% | benefit | poin 0–100 | TPS (kontribusi omset) + risiko stockout |

### 4.2 Rumus
```
Benefit : Rij = Xij / Max(Xj)
Cost    : Rij = Min(Xj) / Xij
Vi      = Σ (Wj × Rij)
```

### 4.3 Cara nilai dihitung dari data nyata
- **C1**: `coverage = stok / (terjual / hari_efektif)`; `urgensi = 100 × (1 − min(1, coverage/30))`; jika `stok ≤ stok_minimum` → minimal **85**; jika ada disposisi OAS pending → **+10** (maks 100).
- **C2**: total unit terjual pada periode terpilih.
- **C3**: `harga_beli × jumlah_disarankan` (jumlah dari `rekomendasi_restock` OAS; jika tidak ada, dihitung dari buffer stok).
- **C4**: `0.6 × kontribusi_omset(%) + 0.4 × risiko_stockout(%)`.

### 4.4 Validasi & penanganan error
| Kasus | Perilaku |
|:---|:---|
| Total bobot ≠ 100% | HTTP **422**, pesan `Total bobot kriteria harus 100%. Total bobot yang dikirim saat ini X%` |
| Bobot negatif / > 100 | HTTP 422 per-kriteria |
| Bobot kriteria tidak dikirim | HTTP 422 (`Bobot untuk kriteria Cx wajib diisi`) |
| Kurang dari 2 kriteria berbobot | HTTP 422 |
| Nilai kriteria `null`/non-numerik/negatif | Dianggap 0 + `peringatan` |
| Cost = 0 | Normalisasi diset 1.0 + peringatan |
| Tidak ada alternatif pada periode | Analyze/simulate → HTTP 422 dengan daftar peringatan; dashboard tetap tampil dengan pesan |
| Tabel sumber tidak ada | Status `tidak_tersedia`, DSS tetap jalan |
| Skor seri | Peringkat sama (competition ranking) |

---

## 5. File yang Ditambahkan (BARU)

### Backend
| File | Fungsi |
|:---|:---|
| `backend/database/migrations/2026_10_19_000001_create_dss_tables.php` | 3 tabel DSS (additive, `down()` hanya drop tabel DSS) |
| `backend/app/Models/DssKriteria.php` | Model kriteria |
| `backend/app/Models/DssAnalisis.php` | Model riwayat analisis (+ relasi `hasil`, `user`) |
| `backend/app/Models/DssHasilAlternatif.php` | Model hasil per alternatif |
| `backend/app/Services/SawService.php` | Mesin SAW murni: validasi bobot, normalisasi, skor, ranking, rekomendasi |
| `backend/app/Services/DssDataService.php` | Pembacaan & validasi data TPS/OAS/KMS/MIS + status sumber data |
| `backend/app/Services/DssService.php` | Orkestrasi: dashboard, analyze, simulate, riwayat, simpan bobot |
| `backend/app/Http/Controllers/Api/DssController.php` | 9 endpoint DSS |
| `backend/database/seeders/DssKriteriaSeeder.php` | Seed 4 kriteria (35/25/20/20) |
| `backend/tests/Unit/SawServiceTest.php` | **12 unit test** perhitungan & validasi SAW |
| `backend/tests/Feature/DssApiTest.php` | **16 feature test** endpoint, otorisasi, regresi |

### Frontend
| File | Fungsi |
|:---|:---|
| `frontend/src/pages/admin/DssDashboard.tsx` | Halaman DSS (5 tab) mengikuti design system existing |

### Dokumentasi
| File | Fungsi |
|:---|:---|
| `DOKUMENTASI_DSS.md` | Dokumen ini |
| `dokumentasi/struktur-project.html` | Halaman bukti struktur project + penanda file DSS |
| `dokumentasi/uji-endpoint.html` | Halaman uji endpoint **live** (15 request HTTP nyata) |
| `dokumentasi/screenshots/*.png` | 14 screenshot aplikasi berjalan |

---

## 6. File Existing yang Diubah (minimal, non-destruktif)

| File | Perubahan | Risiko |
|:---|:---|:---|
| `backend/routes/api.php` | **Menambah** blok `Route::prefix('dss')` (9 route) + 1 baris `use`. Route lain tidak disentuh. | Nol — additive |
| `frontend/src/App.tsx` | Tambah import `DssDashboard` + 1 `case "dss"` | Nol |
| `frontend/src/components/AdminLayout.tsx` | Tambah `"dss"` ke union `AdminPage`, 1 item menu di grup MIS, import `BrainIcon` | Nol |
| `frontend/src/components/Icons.tsx` | **Menambah** 6 ikon di akhir file (`BrainIcon`, `ScaleIcon`, `TrophyIcon`, `DatabaseIcon`, `SaveIcon`) | Nol — additive |
| `frontend/src/services/api.ts` | **Menambah** blok `dssApi` + tipe `Dss*` di akhir file. Kode existing utuh. | Nol — additive |
| `frontend/vite.config.ts` | Target proxy dapat dioverride `VITE_API_PROXY_TARGET`; **default tetap `http://127.0.0.1:8000`** | Nol — default sama |
| `generate_postman.js` | Tambah folder `12. DSS` (9 request) | Nol — additive |
| `postman_collection.json` | Regenerasi (berisi folder DSS baru) | Nol |

> ❌ Tidak ada file TPS/OAS/KMS/MIS yang dihapus, ditimpa, atau di-refactor.
> ❌ Tidak ada migration destruktif. `migrate` hanya menambah 1 migration baru.
> ❌ Tidak ada konfigurasi database/auth yang diubah.

---

## 7. Skema Database DSS (3 tabel baru)

### `dss_kriteria`
| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_kriteria` | bigint PK AI | |
| `kode_kriteria` | varchar(10) UNIQUE | C1..C4 |
| `nama_kriteria` | varchar(100) | |
| `deskripsi` | varchar(255) | |
| `jenis` | enum('benefit','cost') | |
| `bobot` | decimal(5,2) | persen |
| `satuan` | varchar(30) | |
| `urutan` | int | |
| `aktif` | boolean | |

### `dss_analisis` (riwayat keputusan)
| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_analisis` | bigint PK AI | |
| `kode_analisis` | varchar(30) UNIQUE | `DSS-YYYYMMDD-0001` |
| `judul` | varchar(150) | |
| `metode` | varchar(20) | `SAW` |
| `periode`, `periode_awal`, `periode_akhir` | | rentang analisis |
| `total_alternatif`, `total_kriteria` | int | |
| **`kriteria_json`** | json | snapshot kriteria + bobot |
| **`bobot_json`** | json | `{C1:35, C2:25, C3:20, C4:20}` |
| `sumber_data_json` | json | status 4 modul + nilai max/min + peringatan |
| `alternatif_terbaik`, `skor_tertinggi` | | ringkasan hasil |
| `status`, `catatan` | | |
| `id_user` | FK → `users.id_user` (nullOnDelete) | analis |
| `created_at`, `updated_at` | | **waktu analisis** |

### `dss_hasil_alternatif`
| Kolom | Tipe | Keterangan |
|:---|:---|:---|
| `id_hasil` | bigint PK AI | |
| `id_analisis` | FK → `dss_analisis` (cascade) | |
| `id_barang` | FK → `barang` (nullOnDelete) | |
| `kode_alternatif`, `nama_alternatif` | | |
| **`nilai_json`** | json | nilai Xij per kriteria |
| **`normalisasi_json`** | json | Rij per kriteria |
| **`skor`** | decimal(8,6) | Vi |
| **`peringkat`** | int | |
| `rekomendasi` | text | penjelasan |

**Jaminan audit:** bobot + kriteria + skor + peringkat + waktu tersimpan → hasil lama dapat ditinjau ulang persis seperti saat diputuskan.

---

## 8. Endpoint DSS

Semua endpoint memakai prefix existing `api/`, middleware `auth:sanctum`, dan format response `{ success, message, data }`.

| # | Method | Endpoint | Akses | Fungsi |
|:--:|:---|:---|:---|:---|
| 1 | GET | `/api/dss/dashboard` | semua role login | Dashboard: kriteria, peringkat live, status sumber, riwayat |
| 2 | GET | `/api/dss/data-sources` | semua role login | Status aktual TPS/OAS/KMS/MIS |
| 3 | GET | `/api/dss/alternatives` | semua role login | Alternatif + nilai kriteria dari data existing |
| 4 | GET | `/api/dss/criteria` | semua role login | Kriteria + bobot aktif + total bobot |
| 5 | PUT | `/api/dss/criteria` | admin, owner, manager | Simpan bobot aktif |
| 6 | POST | `/api/dss/analyze` | admin, owner, manager | Hitung SAW + simpan riwayat (201) |
| 7 | POST | `/api/dss/simulate` | semua role login | Simulasi bobot, **tidak** disimpan |
| 8 | GET | `/api/dss/history` | semua role login | Riwayat (`?limit=20`, maks 100) |
| 9 | GET | `/api/dss/history/{id}` | semua role login | Detail riwayat (bobot, skor, peringkat, waktu) |

**Parameter umum:** `periode` ∈ `hari_ini | 7_hari | 30_hari | kuartal | all_time`.
**Body analyze/simulate:** `{ periode, judul?, catatan?, bobot?: {C1,C2,C3,C4} }`. Jika `bobot` tidak dikirim, dipakai bobot aktif tersimpan.

### Contoh respons `GET /api/dss/dashboard` (ringkas, data nyata)
```json
{
  "success": true,
  "message": "Data dashboard DSS berhasil diambil.",
  "data": {
    "metode": "SAW",
    "periode": { "kode": "all_time", "label": "Seluruh Riwayat Data",
                 "transaksi_periode": 30, "hari_efektif": 35,
                 "data_pertama": "2026-08-25", "data_terakhir": "2026-09-28" },
    "sumber_data": [
      { "modul": "TPS", "status": "terhubung", "jumlah_record": 112 },
      { "modul": "OAS", "status": "terhubung", "jumlah_record": 75 },
      { "modul": "KMS", "status": "terhubung", "jumlah_record": 7 },
      { "modul": "MIS", "status": "sebagian",  "jumlah_record": 3 }
    ],
    "status_integrasi": { "total_modul": 4, "terhubung": 3, "persentase": 75 },
    "ringkasan": { "total_alternatif": 10, "total_kriteria": 4,
                   "skor_tertinggi": 0.684551, "skor_terendah": 0.043894 },
    "rekomendasi_utama": {
      "nama_alternatif": "Mechanical Keyboard RGB TKL",
      "skor": 0.684551, "peringkat": 1
    }
  }
}
```

---

## 9. Cara DSS Terhubung dengan TPS, OAS, KMS, MIS

| Modul | Tabel yang dibaca DSS | Dipakai untuk |
|:---|:---|:---|
| **TPS** | `transaksi`, `detail_transaksi`, `barang`, `pembelian` | C1, C2, C3, C4 — permintaan, pendapatan, harga beli, stok |
| **OAS** | `rekomendasi_restock`, `stok_log` | jumlah restok disarankan, status disposisi (+10 urgensi jika pending), audit stok |
| **KMS** | `knowledge_base` | rujukan SOP pada penjelasan rekomendasi |
| **MIS** | `laporan_manajemen`, `analisis_penjualan` | konteks laporan manajemen; status `sebagian` bila `analisis_penjualan` kosong |

**Tidak ada duplikasi tabel.** DSS hanya menambah 3 tabel untuk *hasil keputusan*.
**Status sumber data dihitung live** (`Schema::hasTable` + `count()` + `max(timestamp)`), bukan hardcode.

### Transparansi data (sesuai instruksi)
- **Tidak ada data simulasi yang disajikan sebagai data riil.** Semua angka berasal dari database.
- Bila periode tidak punya transaksi (mis. "Hari Ini"), DSS menampilkan **peringatan validasi** dan tidak mengarang nilai.
- Perbedaan data historis (transaksi terakhir 2026-09-28 vs hari ini) dilaporkan eksplisit sebagai peringatan.

---

## 10. Dashboard DSS (Frontend)

Halaman: `frontend/src/pages/admin/DssDashboard.tsx`, diakses dari menu **Sistem Informasi Manajemen (MIS) → "DSS — Decision Support (SAW)"**.

Mengikuti design system existing: kartu `rounded-3xl`, palet slate/indigo, dark mode, font Plus Jakarta Sans, `AdminLayout` + sidebar + autentikasi yang sama.

| Tab | Isi |
|:---|:---|
| **Ringkasan & Rekomendasi** | Rekomendasi utama + penjelasan, dasar nilai per kriteria, **bar chart perbandingan skor**, alur TPS+OAS+KMS→MIS→DSS, konteks keputusan |
| **Sumber Data** | Kartu TPS/OAS/KMS/MIS: status, jumlah record, tabel, dipakai untuk, terakhir update, catatan transparansi |
| **Kriteria & Bobot** | Slider + input angka per kriteria, indikator total bobot (hijau/merah), Simulasi / Simpan Bobot / Reset, jalankan & simpan analisis, rumus SAW |
| **Hasil Perhitungan SAW** | Tabel matriks: nilai Xij, Rij, skor Vi, peringkat; kartu peringkat |
| **Riwayat Analisis** | Tabel riwayat + modal detail berisi snapshot bobot, nilai, normalisasi, skor, peringkat, rekomendasi, peringatan |

Fitur UI: filter 5 periode, sinkronisasi manual, toast notifikasi, disabled-state untuk role tanpa izin, banner peringatan validasi data.

---

## 11. Hasil Pengujian

### 11.1 Test suite otomatis
```
php artisan test
→ 30 passed (132 assertions), 0 failed
```
| File | Jumlah | Cakupan |
|:---|:---:|:---|
| `tests/Unit/SawServiceTest.php` | 12 | Normalisasi benefit/cost sesuai rumus, skor Vi, ranking, skor seri, bobot ≠100%, bobot negatif, bobot kurang, kriteria kosong, data kosong, nilai tidak valid, cost nol, kalimat rekomendasi |
| `tests/Feature/DssApiTest.php` | 16 | Auth 401, dashboard, data-sources (4 modul), alternatives dari TPS, criteria, analyze + simpan riwayat, validasi bobot 422, bobot negatif, periode tanpa data, simulate tidak menyimpan, kasir 403 pada analyze/update, kasir boleh dashboard, update bobot, riwayat 404, **regresi 9 endpoint existing** |
| Existing (`ExampleTest`) | 2 | Tidak berubah, tetap lulus |

### 11.2 Uji endpoint live (aplikasi berjalan)
`dokumentasi/uji-endpoint.html` → **15 PASS · 0 FAIL**
Mencakup: login, 5 endpoint baca, simulasi valid, validasi bobot ditolak, analyze, history, history detail, **4 endpoint regresi existing**, dan otorisasi kasir ditolak.

### 11.3 Uji regresi UI (browser nyata)
11 halaman diuji: MIS Manager, Dashboard, Transaksi, Katalog Produk, Kategori, Stok Log, Pembelian, Supplier, Diskon, Pengguna, DSS → **semua render tanpa page error**.

### 11.4 Build
```
npm run build → ✓ built in 233ms (32 modules)
```

---

## 12. Cara Menjalankan

### Prasyarat
- PHP ≥ 8.3, Composer, MySQL (XAMPP) dengan database `dbtugasmg`, Node.js ≥ 18.

### Langkah
```bash
# 1) Backend
cd backend
composer install                     # jika belum
php artisan migrate                  # menambah 3 tabel DSS (non-destruktif)
php artisan db:seed --class=DssKriteriaSeeder   # seed kriteria 35/25/20/20
php artisan serve --port=8000

# 2) Frontend (terminal lain)
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

> Jika port 8000 dipakai proses lain:
> `VITE_API_PROXY_TARGET=http://127.0.0.1:8001 npm run dev` (dan `php artisan serve --port=8001`).

### Login & akses
| Peran | Username | Password | Akses DSS |
|:---|:---|:---|:---|
| Manager | `manager` | `password123` | Penuh (lihat + ubah bobot + analisis) |
| Admin | `admin` | `password123` | Penuh |
| Kasir | `kasir1` | `password123` | Lihat dashboard saja |

**Alur:** Login → menu **DSS — Decision Support (SAW)** → pilih periode → tab *Kriteria & Bobot* → atur bobot (total harus 100%) → **Simulasikan** → **Hitung & Simpan ke Riwayat** → cek tab *Riwayat Analisis*.

### Menjalankan test
```bash
cd backend && php artisan test
```

---

## 13. Langkah Mengambil Screenshot

Semua screenshot di `dokumentasi/screenshots/` diambil dari **aplikasi yang benar-benar berjalan** (Laravel `:8001` + Vite `:5173` + MySQL `dbtugasmg`), bukan mockup.

| No | Kebutuhan | File | Cara mengambil |
|:--:|:---|:---|:---|
| 1 | Struktur project + modul DSS | `01-struktur-project-dengan-modul-dss.png` | Buka `dokumentasi/struktur-project.html` di browser, screenshot penuh |
| 2 | Dashboard DSS | `02-dashboard-dss.png` | Login manager → menu DSS → tab Ringkasan → screenshot penuh |
| 3 | Sumber data TPS/OAS/KMS/MIS + status | `03-sumber-data-tps-oas-kms-mis.png` | Tab **Sumber Data** |
| 4 | Kriteria & bobot | `04-pengaturan-kriteria-dan-bobot.png` | Tab **Kriteria & Bobot** |
| 5 | Hasil perhitungan SAW | `05-hasil-perhitungan-saw.png` | Klik **Simulasikan Bobot** → tab **Hasil Perhitungan SAW** |
| 6 | Peringkat alternatif | `06-peringkat-alternatif.png` | Tab **Hasil** (tabel + kartu peringkat) |
| 7 | Rekomendasi keputusan | `07-rekomendasi-keputusan.png` | Tab **Ringkasan & Rekomendasi** |
| 8 | Riwayat analisis | `08-riwayat-analisis.png`, `08b-detail-riwayat-analisis.png` | **Hitung & Simpan** → tab **Riwayat** → klik **Detail** |
| 9 | Pengujian endpoint berhasil | `09-pengujian-endpoint-dss.png` | Buka `dokumentasi/uji-endpoint.html` (auto-run, tampil 15 PASS) |
| 10 | Modul existing tetap berfungsi | `10-modul-existing-mis-tetap-berfungsi.png`, `10b-…dashboard-tps.png`, `10c-…katalog-produk.png`, `10d-…transaksi.png` | Login → buka menu MIS/Dashboard/Katalog/Transaksi |

### Mengulang screenshot secara manual
1. Jalankan backend + frontend (bagian 12).
2. Login `manager / password123`.
3. Buka menu DSS, ulangi klik tab sesuai tabel di atas.
4. Gunakan `Cmd+Shift+4` (macOS) atau ekstensi full-page screenshot.
5. Untuk bukti endpoint: buka `dokumentasi/uji-endpoint.html`, tunggu badge **"15 PASS · 0 FAIL"**, lalu screenshot.

---

## 14. Catatan Pemeliharaan

1. **Menambah kriteria baru:** insert ke `dss_kriteria` (kode unik, `jenis`, `bobot`), lalu tambahkan perhitungan nilai di `DssDataService::getAlternatif()` pada array `$nilai`. Bobot total tetap harus 100%.
2. **Mengganti metode** (TOPSIS/AHP): buat service baru yang mengimplementasikan `hitung()` serupa; `DssService` cukup diarahkan ke service tersebut. Skema riwayat sudah menyimpan `metode`.
3. **Periode khusus:** tambahkan pada `DssDataService::PERIODE` + `resolvePeriode()` + validasi `in:` di `DssController`.
4. **Migrasi tabel MIS legacy** (`knowledge_base`, dll.) sebaiknya dibuat terpisah agar `migrate:fresh` konsisten — **belum dilakukan** karena di luar ruang lingkup DSS dan berisiko terhadap data existing.
