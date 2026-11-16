<?php

namespace App\Http\Controllers\Api;

use App\Services\DssService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DssController extends BaseApiController
{
    protected DssService $dssService;

    public function __construct(DssService $dssService)
    {
        $this->dssService = $dssService;
    }

    /**
     * Ringkasan dashboard DSS: status sumber data, kriteria, hasil live, dan riwayat.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $periode = (string) $request->get('periode', 'all_time');
        $data = $this->dssService->getDashboard($periode);

        return $this->sendResponse($data, 'Data dashboard DSS berhasil diambil.');
    }

    /**
     * Status integrasi sumber data TPS, OAS, KMS, dan MIS.
     */
    public function dataSources(): JsonResponse
    {
        $data = $this->dssService->getDashboard('all_time');

        return $this->sendResponse([
            'sumber_data' => $data['sumber_data'],
            'status_integrasi' => $data['status_integrasi'],
        ], 'Status sumber data DSS berhasil diambil.');
    }

    /**
     * Daftar alternatif (barang relevan) beserta nilai kriteria dari data existing.
     */
    public function alternatives(Request $request): JsonResponse
    {
        $periode = (string) $request->get('periode', 'all_time');
        $scope = (string) $request->get('scope', 'relevan');

        $data = $this->dssService->getAlternatif($periode, $scope);

        return $this->sendResponse($data, 'Daftar alternatif DSS berhasil diambil.');
    }

    /**
     * Daftar kriteria DSS beserta bobot aktif.
     */
    public function criteria(): JsonResponse
    {
        $kriteria = $this->dssService->getKriteria();

        return $this->sendResponse([
            'metode' => 'SAW',
            'kriteria' => $kriteria,
            'total_bobot' => round(array_sum(array_column($kriteria, 'bobot')), 2),
            'aturan_bobot' => 'Total bobot seluruh kriteria harus 100%.',
        ], 'Daftar kriteria DSS berhasil diambil.');
    }

    /**
     * Perbarui bobot kriteria (default untuk analisis berikutnya).
     */
    public function updateCriteria(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'bobot' => 'required|array',
            'bobot.*' => 'nullable|numeric|min:0|max:100',
        ]);

        $kriteria = $this->dssService->simpanBobot($payload['bobot']);

        return $this->sendResponse([
            'kriteria' => $kriteria,
            'total_bobot' => round(array_sum(array_column($kriteria, 'bobot')), 2),
        ], 'Bobot kriteria DSS berhasil diperbarui.');
    }

    /**
     * Jalankan analisis SAW dan simpan ke riwayat.
     */
    public function analyze(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'periode' => 'nullable|string|in:hari_ini,7_hari,30_hari,kuartal,all_time',
            'judul' => 'nullable|string|max:150',
            'catatan' => 'nullable|string|max:1000',
            'bobot' => 'nullable|array',
            'bobot.*' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            $hasil = $this->dssService->analyze($validated, $request->user());

            return $this->sendResponse($hasil, 'Analisis SAW berhasil dihitung dan disimpan.', 201);
        } catch (ValidationException $e) {
            return $this->sendError('Analisis DSS gagal dijalankan.', $e->errors(), 422);
        }
    }

    /**
     * Simulasi perhitungan SAW dengan bobot tertentu tanpa menyimpan riwayat.
     */
    public function simulate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'periode' => 'nullable|string|in:hari_ini,7_hari,30_hari,kuartal,all_time',
            'bobot' => 'nullable|array',
            'bobot.*' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            $hasil = $this->dssService->simulate($validated);

            return $this->sendResponse($hasil, 'Simulasi SAW berhasil dihitung (tidak disimpan).');
        } catch (ValidationException $e) {
            return $this->sendError('Simulasi DSS gagal dijalankan.', $e->errors(), 422);
        }
    }

    /**
     * Riwayat analisis DSS.
     */
    public function history(Request $request): JsonResponse
    {
        $limit = (int) $request->get('limit', 20);
        $limit = max(1, min($limit, 100));

        return $this->sendResponse($this->dssService->getRiwayat($limit), 'Riwayat analisis DSS berhasil diambil.');
    }

    /**
     * Detail satu riwayat analisis DSS.
     */
    public function historyDetail(int $id): JsonResponse
    {
        try {
            return $this->sendResponse($this->dssService->getDetailRiwayat($id), 'Detail riwayat analisis DSS berhasil diambil.');
        } catch (ValidationException $e) {
            return $this->sendError('Riwayat analisis DSS tidak ditemukan.', $e->errors(), 404);
        }
    }
}
