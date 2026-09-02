<?php

namespace App\Http\Controllers\Api;

use App\Services\StokLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StokLogController extends BaseApiController
{
    protected StokLogService $stokLogService;

    public function __construct(StokLogService $stokLogService)
    {
        $this->stokLogService = $stokLogService;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'id_barang',
            'jenis',
            'id_user',
            'tanggal_awal',
            'tanggal_akhir',
        ]);
        $perPage = (int) $request->get('per_page', 15);
        $logs = $this->stokLogService->getAll($filters, $perPage);

        return $this->sendResponse($logs, 'Log riwayat stok berhasil diambil.');
    }

    public function penyesuaian(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_barang' => 'required|exists:barang,id_barang',
            'stok_baru' => 'required|integer|min:0',
            'referensi' => 'nullable|string|max:50',
            'keterangan' => 'nullable|string|max:255',
        ]);

        try {
            $log = $this->stokLogService->manualAdjustment($validated, $request->user());

            return $this->sendResponse($log, 'Penyesuaian stok berhasil disimpan.', 201);
        } catch (ValidationException $e) {
            return $this->sendError('Gagal melakukan penyesuaian stok.', $e->errors(), 422);
        }
    }
}
