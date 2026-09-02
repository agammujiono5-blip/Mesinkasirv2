<?php

namespace App\Http\Controllers\Api;

use App\Services\SupplierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends BaseApiController
{
    protected SupplierService $supplierService;

    public function __construct(SupplierService $supplierService)
    {
        $this->supplierService = $supplierService;
    }

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            return $this->sendResponse($this->supplierService->getAllList(), 'Daftar semua supplier berhasil diambil.');
        }

        $filters = $request->only(['search']);
        $perPage = (int) $request->get('per_page', 15);
        $suppliers = $this->supplierService->getAll($filters, $perPage);

        return $this->sendResponse($suppliers, 'Daftar supplier berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_supplier' => 'required|string|max:100',
            'kontak' => 'nullable|string|max:50',
            'alamat' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:100',
        ]);

        $supplier = $this->supplierService->create($validated);

        return $this->sendResponse($supplier, 'Supplier berhasil dibuat.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $supplier = $this->supplierService->findById($id);

        return $this->sendResponse($supplier, 'Detail supplier berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $supplier = $this->supplierService->findById($id);

        $validated = $request->validate([
            'nama_supplier' => 'required|string|max:100',
            'kontak' => 'nullable|string|max:50',
            'alamat' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:100',
        ]);

        $updated = $this->supplierService->update($supplier, $validated);

        return $this->sendResponse($updated, 'Supplier berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $supplier = $this->supplierService->findById($id);
        $this->supplierService->delete($supplier);

        return $this->sendResponse(null, 'Supplier berhasil dihapus.');
    }
}
