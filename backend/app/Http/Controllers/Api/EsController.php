<?php

namespace App\Http\Controllers\Api;

use App\Services\EsDataService;
use App\Services\ExpertSystemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Expert System (Sistem Pakar) — lanjutan DSS dalam rantai TPS → OAS → KMS → MIS → DSS → ES.
 *
 * Menjalankan forward chaining dengan Certainty Factor untuk mendiagnosa
 * penyebab masalah operasional toko berdasarkan gejala yang ditandai pengguna.
 */
class EsController extends BaseApiController
{
    public function __construct(
        protected ExpertSystemService $expertSystemService,
    ) {}

    /**
     * Ringkasan dashboard Expert System.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $periode = $request->query('periode', '90_hari');

        return $this->sendResponse(
            $this->expertSystemService->getDashboard(is_string($periode) ? $periode : '90_hari'),
            'Data dashboard Expert System berhasil diambil.'
        );
    }

    /**
     * Daftar gejala yang dapat dipilih saat diagnosa.
     */
    public function gejala(Request $request): JsonResponse
    {
        $kodeKerusakan = $request->query('kode_kerusakan');
        $gejala = $this->expertSystemService->getGejala(is_string($kodeKerusakan) ? $kodeKerusakan : null);

        return $this->sendResponse([
            'gejala' => $gejala,
            'total' => count($gejala),
        ], 'Daftar gejala Expert System berhasil diambil.');
    }

    /**
     * Daftar hipotesis (kondisi/penyebab) beserta rule IF-THEN.
     */
    public function kerusakan(Request $request): JsonResponse
    {
        $kategori = $request->query('kategori');
        $kerusakan = $this->expertSystemService->getKerusakan(is_string($kategori) ? $kategori : null);

        return $this->sendResponse([
            'kerusakan' => $kerusakan,
            'kategori' => $this->expertSystemService->getDashboard()['kategori'],
            'total' => count($kerusakan),
        ], 'Daftar hipotesis Expert System berhasil diambil.');
    }

    /**
     * Basis aturan (rule) dalam bentuk pernyataan IF-THEN.
     */
    public function aturan(): JsonResponse
    {
        $rule = $this->expertSystemService->getAturan();

        return $this->sendResponse([
            'rule' => $rule,
            'total' => count($rule),
        ], 'Basis aturan Expert System berhasil diambil.');
    }

    /**
     * Jalankan diagnosa lalu simpan hasilnya ke riwayat.
     */
    public function diagnose(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gejala' => 'present|array',
            'otomatis' => 'nullable|boolean',
            'periode' => 'nullable|string|in:'.implode(',', array_keys(EsDataService::PERIODE)),
            'catatan' => 'nullable|string|max:255',
        ], [
            'gejala.present' => 'Sertakan field gejala (boleh kosong bila ingin memakai deteksi otomatis).',
            'gejala.array' => 'Format gejala tidak valid.',
            'periode.in' => 'Periode data tidak dikenal.',
            'catatan.max' => 'Catatan maksimal 255 karakter.',
        ]);

        try {
            $hasil = $this->expertSystemService->diagnose($validated, true, $request->user());

            return $this->sendResponse($hasil, 'Diagnosa Expert System berhasil dihitung dan disimpan.', 201);
        } catch (ValidationException $e) {
            return $this->sendError('Diagnosa Expert System gagal dijalankan.', $e->errors(), 422);
        }
    }

    /**
     * Simulasi diagnosa tanpa menyimpan riwayat.
     */
    public function simulate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gejala' => 'present|array',
            'otomatis' => 'nullable|boolean',
            'periode' => 'nullable|string|in:'.implode(',', array_keys(EsDataService::PERIODE)),
        ], [
            'gejala.present' => 'Sertakan field gejala (boleh kosong bila ingin memakai deteksi otomatis).',
            'gejala.array' => 'Format gejala tidak valid.',
            'periode.in' => 'Periode data tidak dikenal.',
        ]);

        try {
            $hasil = $this->expertSystemService->diagnose($validated, false);

            return $this->sendResponse($hasil, 'Simulasi diagnosa berhasil dihitung (tidak disimpan).');
        } catch (ValidationException $e) {
            return $this->sendError('Simulasi diagnosa gagal dijalankan.', $e->errors(), 422);
        }
    }

    /**
     * Riwayat diagnosa.
     */
    public function history(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 20);
        $limit = max(1, min($limit, 100));

        return $this->sendResponse($this->expertSystemService->getRiwayat($limit), 'Riwayat diagnosa berhasil diambil.');
    }

    /**
     * Detail satu riwayat diagnosa.
     */
    public function historyDetail(int $id): JsonResponse
    {
        try {
            return $this->sendResponse($this->expertSystemService->getDetailRiwayat($id), 'Detail riwayat diagnosa berhasil diambil.');
        } catch (ValidationException $e) {
            return $this->sendError('Riwayat diagnosa tidak ditemukan.', $e->errors(), 404);
        }
    }
}
