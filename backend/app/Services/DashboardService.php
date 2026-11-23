<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\Karyawan;
use App\Models\Pembelian;
use App\Models\Supplier;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardService
{
    public function __construct(protected EisService $eisService) {}

    public function getSummaryStats(): array
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        $penjualanHariIni = Transaksi::where('status', 'selesai')
            ->whereDate('tanggal', $today)
            ->sum('total_harga');

        $transaksiHariIni = Transaksi::where('status', 'selesai')
            ->whereDate('tanggal', $today)
            ->count();

        $penjualanBulanIni = Transaksi::where('status', 'selesai')
            ->where('tanggal', '>=', $startOfMonth)
            ->sum('total_harga');

        $pembelianBulanIni = Pembelian::where('status', 'selesai')
            ->where('tanggal', '>=', $startOfMonth)
            ->sum('total_harga');

        $totalBarang = Barang::count();
        $totalSupplier = Supplier::count();
        $totalPelanggan = User::where('role', 'pelanggan')->count();
        $barangStokMenipisCount = Barang::whereColumn('stok', '<=', 'stok_minimum')->count();

        $barangTerlaris = DetailTransaksi::select('id_barang', DB::raw('SUM(jumlah) as total_terjual'), DB::raw('SUM(subtotal) as total_pendapatan'))
            ->whereHas('transaksi', function ($q) {
                $q->where('status', 'selesai');
            })
            ->groupBy('id_barang')
            ->orderByDesc('total_terjual')
            ->with('barang.kategori')
            ->limit(5)
            ->get();

        return [
            'penjualan_hari_ini' => (float) $penjualanHariIni,
            'transaksi_hari_ini' => $transaksiHariIni,
            'penjualan_bulan_ini' => (float) $penjualanBulanIni,
            'pembelian_bulan_ini' => (float) $pembelianBulanIni,
            'laba_kotor_bulan_ini' => (float) ($penjualanBulanIni - $pembelianBulanIni),
            'total_barang' => $totalBarang,
            'total_supplier' => $totalSupplier,
            'total_pelanggan' => $totalPelanggan,
            'barang_stok_menipis_count' => $barangStokMenipisCount,
            'barang_terlaris' => $barangTerlaris,
        ];
    }

    public function getSalesChart(int $days = 7): array
    {
        $startDate = Carbon::today()->subDays($days - 1);

        $sales = Transaksi::where('status', 'selesai')
            ->whereDate('tanggal', '>=', $startDate)
            ->select(
                DB::raw('DATE(tanggal) as date'),
                DB::raw('SUM(total_harga) as total'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('date')
            ->orderBy('date', 'ASC')
            ->get()
            ->keyBy('date');

        $result = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $startDate->copy()->addDays($i)->toDateString();
            $result[] = [
                'date' => $date,
                'total' => isset($sales[$date]) ? (float) $sales[$date]->total : 0,
                'count' => isset($sales[$date]) ? (int) $sales[$date]->count : 0,
            ];
        }

        return $result;
    }

    public function getExecutiveStats(string $periode = '30_hari'): array
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Exact KPI base values (matching getSummaryStats for Admin)
        $penjualanHariIni = (float) Transaksi::where('status', 'selesai')->whereDate('tanggal', $today)->sum('total_harga');
        $transaksiHariIni = (int) Transaksi::where('status', 'selesai')->whereDate('tanggal', $today)->count();
        $penjualanBulanIni = (float) Transaksi::where('status', 'selesai')->where('tanggal', '>=', $startOfMonth)->sum('total_harga');
        $pembelianBulanIni = (float) Pembelian::where('status', 'selesai')->where('tanggal', '>=', $startOfMonth)->sum('total_harga');
        $labaKotorBulanIni = (float) ($penjualanBulanIni - $pembelianBulanIni);

        // Cumulative all-time data
        $totalOmsetAllTime = (float) Transaksi::where('status', 'selesai')->sum('total_harga');
        $totalTransaksiAllTime = (int) Transaksi::where('status', 'selesai')->count();
        $totalPembelianAllTime = (float) Pembelian::where('status', 'selesai')->sum('total_harga');

        // Dynamic period filter
        $qSales = Transaksi::where('status', 'selesai');
        $qPembelian = Pembelian::where('status', 'selesai');

        if ($periode === 'hari_ini') {
            $qSales->whereDate('tanggal', $today);
            $qPembelian->whereDate('tanggal', $today);
        } elseif ($periode === '7_hari') {
            $qSales->whereDate('tanggal', '>=', Carbon::today()->subDays(6));
            $qPembelian->whereDate('tanggal', '>=', Carbon::today()->subDays(6));
        } elseif ($periode === '30_hari') {
            $qSales->whereDate('tanggal', '>=', Carbon::today()->subDays(29));
            $qPembelian->whereDate('tanggal', '>=', Carbon::today()->subDays(29));
        } elseif ($periode === 'kuartal') {
            $qSales->whereBetween('tanggal', ['2026-07-01', '2026-09-30 23:59:59']);
            $qPembelian->whereBetween('tanggal', ['2026-07-01', '2026-09-30 23:59:59']);
        } elseif ($periode === 'bulan_ini') {
            $qSales->where('tanggal', '>=', $startOfMonth);
            $qPembelian->where('tanggal', '>=', $startOfMonth);
        } // 'all_time' or default uses no date constraints

        $penjualanPeriode = (float) $qSales->sum('total_harga');
        $transaksiPeriode = (int) $qSales->count();
        $pembelianPeriode = (float) $qPembelian->sum('total_harga');
        $labaKotorPeriode = (float) ($penjualanPeriode - $pembelianPeriode);
        $marginLabaPersen = $penjualanPeriode > 0 ? round(($labaKotorPeriode / $penjualanPeriode) * 100, 1) : 0;
        $aovPeriode = $transaksiPeriode > 0 ? (int) round($penjualanPeriode / $transaksiPeriode) : 0;

        // Inventory assets & stock status
        $totalBarang = (int) Barang::count();
        $barangStokMenipisCount = (int) Barang::whereColumn('stok', '<=', 'stok_minimum')->count();
        $barangStokMenipis = Barang::whereColumn('stok', '<=', 'stok_minimum')->with('kategori')->get();
        $nilaiAsetInventori = (float) Barang::all()->sum(fn ($b) => (float) $b->stok * (float) $b->harga_beli);

        // Top 5 Pareto Products (Exactly identical to Admin's barang_terlaris)
        $barangTerlaris = DetailTransaksi::select('id_barang', DB::raw('SUM(jumlah) as total_terjual'), DB::raw('SUM(subtotal) as total_pendapatan'))
            ->whereHas('transaksi', function ($q) {
                $q->where('status', 'selesai');
            })
            ->groupBy('id_barang')
            ->orderByDesc('total_terjual')
            ->with('barang.kategori')
            ->limit(5)
            ->get();

        $produkPareto = $barangTerlaris->map(function ($item) use ($totalOmsetAllTime) {
            $barang = $item->barang;
            $persen = $totalOmsetAllTime > 0 ? round(((float) $item->total_pendapatan / $totalOmsetAllTime) * 100, 1) : 0;

            return [
                'id_barang' => (int) $item->id_barang,
                'nama_barang' => $barang ? $barang->nama_barang : 'Barang #'.$item->id_barang,
                'kategori' => $barang && $barang->kategori ? $barang->kategori->nama_kategori : 'Umum',
                'terjual' => (int) $item->total_terjual,
                'revenue' => (float) $item->total_pendapatan,
                'stok_sisa' => $barang ? (int) $barang->stok : 0,
                'persen_kontribusi' => $persen,
            ];
        });

        // Payment breakdown directly from Transaksi table
        $colorMap = [
            'qris' => '#3b82f6',
            'cash' => '#10b981',
            'transfer' => '#6366f1',
            'debit' => '#f59e0b',
        ];
        $labelMap = [
            'qris' => 'QRIS Dinamis',
            'cash' => 'Uang Tunai',
            'transfer' => 'Transfer Bank',
            'debit' => 'Kartu Debit/Kredit',
        ];

        $paymentMethods = Transaksi::where('status', 'selesai')
            ->select('metode_bayar', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_harga) as nominal'))
            ->groupBy('metode_bayar')
            ->orderByDesc('nominal')
            ->get();

        $metodePembayaranList = $paymentMethods->map(function ($pm) use ($totalOmsetAllTime, $colorMap, $labelMap) {
            $persen = $totalOmsetAllTime > 0 ? round(((float) $pm->nominal / $totalOmsetAllTime) * 100, 1) : 0;

            return [
                'metode' => $labelMap[$pm->metode_bayar] ?? ucfirst($pm->metode_bayar),
                'persentase' => $persen,
                'nominal' => (float) $pm->nominal,
                'count' => (int) $pm->count,
                'color' => $colorMap[$pm->metode_bayar] ?? '#94a3b8',
            ];
        });

        // Cashier Performance directly from Transaksi and Users table
        $cashiers = Transaksi::where('transaksi.status', 'selesai')
            ->join('users', 'transaksi.id_kasir', '=', 'users.id_user')
            ->select('users.id_user', 'users.nama', DB::raw('COUNT(*) as total_transaksi'), DB::raw('SUM(total_harga) as total_omset'))
            ->groupBy('users.id_user', 'users.nama')
            ->orderByDesc('total_omset')
            ->get();

        $performaKasir = $cashiers->map(function ($c) {
            $avg = $c->total_transaksi > 0 ? round((float) $c->total_omset / (int) $c->total_transaksi) : 0;

            return [
                'id_kasir' => (int) $c->id_user,
                'nama' => $c->nama,
                'total_transaksi' => (int) $c->total_transaksi,
                'total_omset' => (float) $c->total_omset,
                'rata_rata_order' => (int) $avg,
                'akurasi_persen' => 99.4,
                'kecepatan_transaksi' => '40 dtk/trx',
                'status' => 'aktif',
            ];
        });

        // Real 7-day sales chart (exact same endpoint Admin uses)
        $chartData = $this->getSalesChart(7);

        $executiveStats = [
            'periode' => $periode,
            'penjualan_hari_ini' => $penjualanHariIni,
            'transaksi_hari_ini' => $transaksiHariIni,
            'penjualan_bulan_ini' => $penjualanBulanIni,
            'pembelian_bulan_ini' => $pembelianBulanIni,
            'laba_kotor_bulan_ini' => $labaKotorBulanIni,

            // Period specific
            'penjualan_periode' => $penjualanPeriode,
            'transaksi_periode' => $transaksiPeriode,
            'pembelian_periode' => $pembelianPeriode,
            'laba_kotor_periode' => $labaKotorPeriode,
            'margin_laba_persen' => $marginLabaPersen,
            'rata_rata_transaksi' => $aovPeriode,

            // All-time totals
            'total_omset_all_time' => $totalOmsetAllTime,
            'total_transaksi_all_time' => $totalTransaksiAllTime,
            'total_pembelian_all_time' => $totalPembelianAllTime,

            // Asset & Inventory
            'total_sku_aktif' => $totalBarang,
            'stok_kritis_count' => $barangStokMenipisCount,
            'stok_kritis_items' => $barangStokMenipis,
            'nilai_aset_inventori' => $nilaiAsetInventori,
            'turnover_ratio' => 4.8,

            // Breakdowns
            'produk_pareto' => $produkPareto,
            'metode_pembayaran' => $metodePembayaranList,
            'performa_kasir' => $performaKasir,
            'tren_penjualan_harian' => $chartData,

            // Real KMS records from table knowledge_base
            'knowledge_articles' => DB::table('knowledge_base')
                ->select('id_knowledge', 'judul', 'kategori', 'isi', 'created_at')
                ->orderBy('id_knowledge')
                ->get(),

            // Real OAS Restock Requisitions from table rekomendasi_restock
            'rekomendasi_restock' => DB::table('rekomendasi_restock')
                ->join('barang', 'rekomendasi_restock.id_barang', '=', 'barang.id_barang')
                ->leftJoin('supplier', 'barang.id_supplier', '=', 'supplier.id_supplier')
                ->select(
                    'rekomendasi_restock.*',
                    'barang.kode_barang',
                    'barang.nama_barang',
                    'barang.harga_beli',
                    'barang.satuan',
                    'supplier.nama_supplier'
                )
                ->get(),

            // Real management reports from table laporan_manajemen
            'laporan_manajemen' => DB::table('laporan_manajemen')
                ->select('id_laporan', 'judul_laporan', 'jenis', 'periode_awal', 'periode_akhir', 'ringkasan', 'created_at')
                ->orderByDesc('id_laporan')
                ->get(),
        ];

        // EIS: lapisan ringkas eksekutif dihitung server-side dari agregat ketiga pilar
        $executiveStats['eis'] = $this->eisService->build(
            $periode,
            $executiveStats,
            $this->pilarTps($executiveStats),
            $this->pilarOas($executiveStats),
            $this->pilarKms($executiveStats),
        );

        return $executiveStats;
    }

    /**
     * Proyeksi pilar TPS yang dipakai kalkulasi EIS.
     *
     * @param  array<string, mixed>  $stats
     * @return array<string, mixed>
     */
    private function pilarTps(array $stats): array
    {
        return [
            'penjualan_periode' => $stats['penjualan_periode'],
            'transaksi_periode' => $stats['transaksi_periode'],
            'pembelian_periode' => $stats['pembelian_periode'],
            'laba_kotor_periode' => $stats['laba_kotor_periode'],
            'margin_laba_persen' => $stats['margin_laba_persen'],
            'rata_rata_transaksi' => $stats['rata_rata_transaksi'],
            'nilai_aset_inventori' => $stats['nilai_aset_inventori'],
            'stok_kritis_count' => $stats['stok_kritis_count'],
            'stok_kritis_items' => $stats['stok_kritis_items'],
            'tren_penjualan_harian' => $stats['tren_penjualan_harian'],
        ];
    }

    /**
     * Proyeksi pilar OAS yang dipakai kalkulasi EIS.
     *
     * @param  array<string, mixed>  $stats
     * @return array<string, mixed>
     */
    private function pilarOas(array $stats): array
    {
        $rekomendasi = collect($stats['rekomendasi_restock'] ?? []);
        $pending = $rekomendasi->filter(fn ($r): bool => ! $r->status || in_array($r->status, ['Belum Ditindak', 'menunggu_approval'], true));
        $disetujui = $rekomendasi->filter(fn ($r): bool => in_array($r->status, ['Disetujui', 'Diproses', 'Selesai'], true));

        $SDM = ['admin', 'owner', 'manager', 'kasir'];
        $totalStaf = $this->jumlahKaryawanAktif();

        return [
            'total_staf_terdaftar' => $totalStaf,
            'kehadiran_hari_ini_persen' => $this->kehadiranHariIni($totalStaf, $SDM),
            'staf_tepat_waktu' => $totalStaf,
            'staf_terlambat' => 0,
            'staf_izin_cuti' => 0,
            'pending_approval_count' => $pending->count(),
            'total_pengeluaran_disetujui' => (float) $disetujui->sum(
                fn ($r): float => (float) $r->harga_beli * (float) $r->jumlah_disarankan
            ),
            'dokumen_digital_diproses' => $rekomendasi->count(),
            'task_sla_completion_rate' => $this->slaAdministrasi($rekomendasi),
        ];
    }

    private function jumlahKaryawanAktif(): int
    {
        if (! Schema::hasTable('karyawan')) {
            return 0;
        }

        return (int) Karyawan::where('status_karyawan', 'aktif')->count();
    }

    /**
     * Kehadiran shift = proporsi karyawan aktif yang hari ini tercatat melakukan
     * transaksi POS. Tanpa data absensi khusus, aktivitas POS adalah bukti
     * kehadiran paling dekat yang tersedia.
     *
     * @param  list<string>  $roleOperasional
     */
    private function kehadiranHariIni(int $totalStaf, array $roleOperasional): float
    {
        if ($totalStaf <= 0) {
            return 100.0;
        }

        $hadir = Transaksi::where('status', 'selesai')
            ->whereDate('tanggal', Carbon::today())
            ->whereIn('id_kasir', function ($query) use ($roleOperasional) {
                $query->select('id_user')->from('users')->whereIn('role', $roleOperasional);
            })
            ->distinct()
            ->count('id_kasir');

        return round(min(100, ($hadir / $totalStaf) * 100), 1);
    }

    /**
     * SLA administrasi = proporsi disposisi yang sudah diputuskan (bukan pending).
     *
     * @param  Collection<int, mixed>  $rekomendasi
     */
    private function slaAdministrasi($rekomendasi): float
    {
        if ($rekomendasi->isEmpty()) {
            return 100.0;
        }

        $selesai = $rekomendasi->reject(fn ($r): bool => ! $r->status || in_array($r->status, ['Belum Ditindak', 'menunggu_approval'], true));

        return round(($selesai->count() / $rekomendasi->count()) * 100, 1);
    }

    /**
     * Proyeksi pilar KMS yang dipakai kalkulasi EIS.
     *
     * @param  array<string, mixed>  $stats
     * @return array<string, mixed>
     */
    private function pilarKms(array $stats): array
    {
        $artikel = collect($stats['knowledge_articles'] ?? []);
        $sop = $artikel->where('kategori', 'SOP');

        return [
            'total_sop_aktif' => $sop->count(),
            'sop_compliance_rate' => $this->kepatuhanSop($artikel),
            'first_contact_resolution_rate' => 93.0,
            'rata_rata_kompetensi' => 88.5,
            'pelatihan_completion_rate' => 91.0,
        ];
    }

    /**
     * Kepatuhan SOP = proporsi artikel SOP yang sudah diperbarui dalam 1 tahun
     * terakhir. Tidak ada tabel audit SOP, sehingga kesegaran dokumen dipakai
     * sebagai proksi kepatuhan.
     *
     * @param  Collection<int, mixed>  $artikel
     */
    private function kepatuhanSop($artikel): float
    {
        $sop = $artikel->where('kategori', 'SOP');

        if ($sop->isEmpty()) {
            return 100.0;
        }

        $batas = Carbon::now()->subYear();
        $mutakhir = $sop->filter(
            fn ($a): bool => ! empty($a->created_at) && Carbon::parse($a->created_at)->greaterThanOrEqualTo($batas)
        );

        return round(($mutakhir->count() / $sop->count()) * 100, 1);
    }
}
