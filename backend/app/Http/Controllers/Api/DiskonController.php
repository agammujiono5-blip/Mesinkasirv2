<?php

namespace App\Http\Controllers\Api;

use App\Services\DiskonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiskonController extends BaseApiController
{
    protected DiskonService $diskonService;

    public function __construct(DiskonService $diskonService)
    {
        $this->diskonService = $diskonService;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'status']);
        $perPage = (int) $request->get('per_page', 15);
        $diskon = $this->diskonService->getAll($filters, $perPage);

        return $this->sendResponse($diskon, 'Daftar diskon berhasil diambil.');
    }

    public function diskonAktif(): JsonResponse
    {
        $diskon = $this->diskonService->getActiveDiscounts();

        return $this->sendResponse($diskon, 'Daftar diskon aktif berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_diskon' => 'required|string|max:100',
            'tipe' => 'required|in:persen,nominal',
            'nilai' => 'required|numeric|min:0',
            'id_barang' => 'nullable|exists:barang,id_barang',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'status' => 'nullable|in:aktif,nonaktif',
        ]);

        $diskon = $this->diskonService->create($validated);

        return $this->sendResponse($diskon, 'Diskon berhasil ditambahkan.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $diskon = $this->diskonService->findById($id);

        return $this->sendResponse($diskon, 'Detail diskon berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $diskon = $this->diskonService->findById($id);

        $validated = $request->validate([
            'nama_diskon' => 'sometimes|required|string|max:100',
            'tipe' => 'sometimes|required|in:persen,nominal',
            'nilai' => 'sometimes|required|numeric|min:0',
            'id_barang' => 'nullable|exists:barang,id_barang',
            'tanggal_mulai' => 'sometimes|required|date',
            'tanggal_selesai' => 'sometimes|required|date|after_or_equal:tanggal_mulai',
            'status' => 'sometimes|required|in:aktif,nonaktif',
        ]);

        $updated = $this->diskonService->update($diskon, $validated);

        return $this->sendResponse($updated, 'Diskon berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $diskon = $this->diskonService->findById($id);
        $this->diskonService->delete($diskon);

        return $this->sendResponse(null, 'Diskon berhasil dihapus.');
    }
}
