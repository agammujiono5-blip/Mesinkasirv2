<?php

namespace App\Http\Controllers\Api;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends BaseApiController
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function stats(): JsonResponse
    {
        $stats = $this->dashboardService->getSummaryStats();

        return $this->sendResponse($stats, 'Statistik dashboard berhasil diambil.');
    }

    public function chart(Request $request): JsonResponse
    {
        $days = (int) $request->get('days', 7);
        $chart = $this->dashboardService->getSalesChart($days);

        return $this->sendResponse($chart, 'Data grafik penjualan berhasil diambil.');
    }
}
