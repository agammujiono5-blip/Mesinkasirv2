<?php

namespace App\Http\Controllers\Api;

use App\Services\TransaksiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TransaksiController extends BaseApiController
{
    protected TransaksiService $transaksiService;

    public function __construct(TransaksiService $transaksiService)
    {
        $this->transaksiService = $transaksiService;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'no_transaksi',
            'status',
            'metode_bayar',
            'id_kasir',
            'id_pelanggan',
            'tanggal_awal',
            'tanggal_akhir',
        ]);
        $perPage = (int) $request->get('per_page', 15);
        $transaksi = $this->transaksiService->getAll($filters, $perPage);

        return $this->sendResponse($transaksi, 'Daftar transaksi berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_pelanggan' => 'nullable|exists:users,id_user',
            'tanggal' => 'nullable|date',
            'metode_bayar' => 'required|in:cash,transfer,qris,debit,kredit',
            'items' => 'required|array|min:1',
            'items.*.id_barang' => 'required|exists:barang,id_barang',
            'items.*.jumlah' => 'required|integer|min:1',
            'items.*.id_diskon' => 'nullable|exists:diskon,id_diskon',
        ]);

        try {
            $transaksi = $this->transaksiService->create($validated, $request->user());

            return $this->sendResponse($transaksi, 'Transaksi berhasil dibuat.', 201);
        } catch (ValidationException $e) {
            return $this->sendError('Gagal memproses transaksi.', $e->errors(), 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $transaksi = $this->transaksiService->findById($id);

        return $this->sendResponse($transaksi, 'Detail transaksi berhasil diambil.');
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $transaksi = $this->transaksiService->findById($id);

        try {
            $cancelled = $this->transaksiService->cancel($transaksi, $request->user());

            return $this->sendResponse($cancelled, 'Transaksi berhasil dibatalkan dan stok dikembalikan.');
        } catch (ValidationException $e) {
            return $this->sendError('Gagal membatalkan transaksi.', $e->errors(), 422);
        }
    }
}
