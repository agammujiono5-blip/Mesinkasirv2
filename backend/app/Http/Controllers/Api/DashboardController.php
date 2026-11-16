<?php

namespace App\Http\Controllers\Api;

use App\Services\DashboardService;
use App\Support\RoleAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseApiController
{
    public function __construct(protected DashboardService $dashboardService) {}

    /**
     * Ringkasan dashboard.
     *
     * Kasir hanya menerima ringkasan penjualan & stok operasional; data bisnis
     * (laba kotor, pengadaan, jumlah pelanggan, produk terlaris) hanya untuk
     * admin, owner, dan manager. Daftar produk terlaris bergantung pada data
     * penjualan sehingga ikut dikosongkan untuk kasir.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $stats = $this->dashboardService->getSummaryStats();

        $bolehBisnis = $user->hasRole(...RoleAccess::DASHBOARD_BISNIS);
        $bolehPesanan = $user->hasRole(...RoleAccess::DASHBOARD_PESANAN);

        if (! $bolehBisnis) {
            $stats = array_intersect_key($stats, array_flip([
                'penjualan_hari_ini',
                'transaksi_hari_ini',
                'penjualan_bulan_ini',
                'total_barang',
                'barang_stok_menipis_count',
            ]));
        }

        if (! $bolehBisnis) {
            $stats['barang_terlaris'] = [];
        }

        $stats['akses'] = [
            'ringkasan_bisnis' => $bolehBisnis,
            'ringkasan_pesanan' => $bolehPesanan,
        ];

        return $this->sendResponse($stats, 'Statistik dashboard berhasil diambil.');
    }

    /**
     * Grafik penjualan — sama untuk semua role yang boleh membuka dashboard.
     */
    public function chart(Request $request): JsonResponse
    {
        $days = (int) $request->get('days', 7);
        $chart = $this->dashboardService->getSalesChart($days);

        return $this->sendResponse($chart, 'Data grafik penjualan berhasil diambil.');
    }

    public function executive(Request $request): JsonResponse
    {
        $periode = $request->get('periode', 'bulan_ini');
        $executiveData = $this->dashboardService->getExecutiveStats($periode);

        return $this->sendResponse($executiveData, 'Data analitik eksekutif MIS berhasil diambil.');
    }

    public function updateRestock(Request $request, $id): JsonResponse
    {
        $status = $request->get('status', 'Diproses');
        DB::table('rekomendasi_restock')
            ->where('id_rekomendasi', $id)
            ->update([
                'status' => $status,
            ]);

        return $this->sendResponse(null, 'Status rekomendasi restok berhasil diperbarui di database.');
    }
}
