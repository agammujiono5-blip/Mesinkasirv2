<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\DetailPembelian;
use App\Models\Pembelian;
use App\Models\StokLog;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PembelianService
{
    /**
     * Get paginated purchases.
     */
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Pembelian::with(['supplier', 'admin', 'detailPembelian.barang']);

        if (!empty($filters['no_pembelian'])) {
            $query->where('no_pembelian', 'like', "%{$filters['no_pembelian']}%");
        }

        if (!empty($filters['id_supplier'])) {
            $query->where('id_supplier', $filters['id_supplier']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['tanggal_awal']) && !empty($filters['tanggal_akhir'])) {
            $query->whereBetween('tanggal', [
                Carbon::parse($filters['tanggal_awal'])->startOfDay(),
                Carbon::parse($filters['tanggal_akhir'])->endOfDay(),
            ]);
        }

        return $query->latest('id_pembelian')->paginate($perPage);
    }

    /**
     * Find purchase by ID.
     */
    public function findById(int $id): Pembelian
    {
        return Pembelian::with(['supplier', 'admin', 'detailPembelian.barang'])->findOrFail($id);
    }

    /**
     * Create a new purchase / restocking transaction.
     */
    public function create(array $data, User $admin): Pembelian
    {
        if (empty($data['items']) || !is_array($data['items'])) {
            throw ValidationException::withMessages([
                'items' => ['Daftar barang pembelian tidak boleh kosong.'],
            ]);
        }

        return DB::transaction(function () use ($data, $admin) {
            $noPembelian = 'PB-' . date('Ymd') . '-' . strtoupper(Str::random(5));
            $totalHarga = 0;
            $itemsToInsert = [];
            $stokLogsToInsert = [];

            foreach ($data['items'] as $item) {
                $barang = Barang::lockForUpdate()->find($item['id_barang']);

                if (!$barang) {
                    throw ValidationException::withMessages([
                        'items' => ["Barang dengan ID {$item['id_barang']} tidak ditemukan."],
                    ]);
                }

                $jumlah = (int) $item['jumlah'];
                if ($jumlah <= 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Jumlah untuk barang {$barang->nama_barang} harus lebih dari 0."],
                    ]);
                }

                $hargaBeliSatuan = isset($item['harga_beli_satuan']) ? (float) $item['harga_beli_satuan'] : (float) $barang->harga_beli;
                $subtotal = $hargaBeliSatuan * $jumlah;
                $totalHarga += $subtotal;

                $stokSebelum = $barang->stok;
                $stokSesudah = $stokSebelum + $jumlah;

                $barang->update([
                    'stok' => $stokSesudah,
                    'harga_beli' => $hargaBeliSatuan,
                ]);

                $itemsToInsert[] = [
                    'id_barang' => $barang->id_barang,
                    'jumlah' => $jumlah,
                    'harga_beli_satuan' => $hargaBeliSatuan,
                    'subtotal' => $subtotal,
                ];

                $stokLogsToInsert[] = [
                    'id_barang' => $barang->id_barang,
                    'jenis' => 'masuk',
                    'jumlah' => $jumlah,
                    'stok_sebelum' => $stokSebelum,
                    'stok_sesudah' => $stokSesudah,
                    'referensi' => $noPembelian,
                    'keterangan' => "Pembelian Restok Supplier ({$noPembelian})",
                    'id_user' => $admin->id_user,
                    'created_at' => now(),
                ];
            }

            $pembelian = Pembelian::create([
                'no_pembelian' => $noPembelian,
                'id_supplier' => $data['id_supplier'],
                'id_admin' => $admin->id_user,
                'tanggal' => $data['tanggal'] ?? now(),
                'total_harga' => $totalHarga,
                'status' => 'selesai',
            ]);

            foreach ($itemsToInsert as $detail) {
                $detail['id_pembelian'] = $pembelian->id_pembelian;
                DetailPembelian::create($detail);
            }

            foreach ($stokLogsToInsert as $log) {
                StokLog::create($log);
            }

            return $pembelian->fresh(['supplier', 'admin', 'detailPembelian.barang']);
        });
    }
}
