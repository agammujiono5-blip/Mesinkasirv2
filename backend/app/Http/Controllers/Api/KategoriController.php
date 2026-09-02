<?php

namespace App\Http\Controllers\Api;

use App\Services\KategoriService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KategoriController extends BaseApiController
{
    protected KategoriService $kategoriService;

    public function __construct(KategoriService $kategoriService)
    {
        $this->kategoriService = $kategoriService;
    }

    public function index(): JsonResponse
    {
        $kategori = $this->kategoriService->getAll();

        return $this->sendResponse($kategori, 'Daftar kategori berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_kategori' => 'required|string|max:50',
        ]);

        $kategori = $this->kategoriService->create($validated);

        return $this->sendResponse($kategori, 'Kategori berhasil dibuat.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $kategori = $this->kategoriService->findById($id);

        return $this->sendResponse($kategori, 'Detail kategori berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $kategori = $this->kategoriService->findById($id);

        $validated = $request->validate([
            'nama_kategori' => 'required|string|max:50',
        ]);

        $updated = $this->kategoriService->update($kategori, $validated);

        return $this->sendResponse($updated, 'Kategori berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $kategori = $this->kategoriService->findById($id);
        $this->kategoriService->delete($kategori);

        return $this->sendResponse(null, 'Kategori berhasil dihapus.');
    }
}
