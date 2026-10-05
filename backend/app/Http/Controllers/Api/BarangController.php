<?php

namespace App\Http\Controllers\Api;

use App\Services\BarangService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarangController extends BaseApiController
{
    protected BarangService $barangService;

    public function __construct(BarangService $barangService)
    {
        $this->barangService = $barangService;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'id_kategori', 'id_supplier', 'stok_menipis']);
        $perPage = (int) $request->get('per_page', 15);
        $barang = $this->barangService->getAll($filters, $perPage);

        return $this->sendResponse($barang, 'Daftar barang berhasil diambil.');
    }

    public function stokMinimum(): JsonResponse
    {
        $items = $this->barangService->getLowStockItems();

        return $this->sendResponse($items, 'Daftar barang dengan stok menipis berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'kode_barang' => 'nullable|string|max:20|unique:barang,kode_barang',
            'id_kategori' => 'required|exists:kategori,id_kategori',
            'id_supplier' => 'nullable|exists:supplier,id_supplier',
            'nama_barang' => 'required|string|max:100',
            'deskripsi' => 'nullable|string',
            'harga_beli' => 'required|numeric|min:0',
            'harga_jual' => 'required|numeric|min:0',
            'stok' => 'nullable|integer|min:0',
            'stok_minimum' => 'nullable|integer|min:0',
            'satuan' => 'required|string|max:20',
            'gambar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $gambar = $request->file('gambar');
        $barang = $this->barangService->create($validated, $gambar);

        return $this->sendResponse($barang, 'Barang berhasil ditambahkan.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $barang = $this->barangService->findById($id);

        return $this->sendResponse($barang, 'Detail barang berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $barang = $this->barangService->findById($id);

        $validated = $request->validate([
            'kode_barang' => "sometimes|required|string|max:20|unique:barang,kode_barang,{$barang->id_barang},id_barang",
            'id_kategori' => 'sometimes|required|exists:kategori,id_kategori',
            'id_supplier' => 'nullable|exists:supplier,id_supplier',
            'nama_barang' => 'sometimes|required|string|max:100',
            'deskripsi' => 'nullable|string',
            'harga_beli' => 'sometimes|required|numeric|min:0',
            'harga_jual' => 'sometimes|required|numeric|min:0',
            'stok' => 'sometimes|integer|min:0',
            'stok_minimum' => 'sometimes|integer|min:0',
            'satuan' => 'sometimes|required|string|max:20',
            'gambar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'hapus_gambar' => 'nullable',
        ]);

        $gambar = $request->file('gambar');
        $updated = $this->barangService->update($barang, $validated, $gambar);

        return $this->sendResponse($updated, 'Barang berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $barang = $this->barangService->findById($id);
        $this->barangService->delete($barang);

        return $this->sendResponse(null, 'Barang berhasil dihapus.');
    }
}
