<?php

namespace App\Http\Controllers\Api;

use App\Services\PembelianService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PembelianController extends BaseApiController
{
    protected PembelianService $pembelianService;

    public function __construct(PembelianService $pembelianService)
    {
        $this->pembelianService = $pembelianService;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'no_pembelian',
            'id_supplier',
            'status',
            'tanggal_awal',
            'tanggal_akhir',
        ]);
        $perPage = (int) $request->get('per_page', 15);
        $pembelian = $this->pembelianService->getAll($filters, $perPage);

        return $this->sendResponse($pembelian, 'Daftar pembelian berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_supplier' => 'required|exists:supplier,id_supplier',
            'tanggal' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.id_barang' => 'required|exists:barang,id_barang',
            'items.*.jumlah' => 'required|integer|min:1',
            'items.*.harga_beli_satuan' => 'nullable|numeric|min:0',
        ]);

        try {
            $pembelian = $this->pembelianService->create($validated, $request->user());

            return $this->sendResponse($pembelian, 'Pembelian/Restok barang berhasil dicatat.', 201);
        } catch (ValidationException $e) {
            return $this->sendError('Gagal memproses pembelian.', $e->errors(), 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $pembelian = $this->pembelianService->findById($id);

        return $this->sendResponse($pembelian, 'Detail pembelian berhasil diambil.');
    }
}
