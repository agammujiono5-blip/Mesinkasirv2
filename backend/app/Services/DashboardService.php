<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\Pembelian;
use App\Models\Supplier;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Get summary metrics for the management dashboard.
     */
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

    /**
     * Get sales chart data for the last N days.
     */
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
}
