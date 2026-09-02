<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\StokLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StokLogService
{
    /**
     * Get paginated stock logs.
     */
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = StokLog::with(['barang.kategori', 'user']);

        if (!empty($filters['id_barang'])) {
            $query->where('id_barang', $filters['id_barang']);
        }

        if (!empty($filters['jenis'])) {
            $query->where('jenis', $filters['jenis']);
        }

        if (!empty($filters['id_user'])) {
            $query->where('id_user', $filters['id_user']);
        }

        if (!empty($filters['tanggal_awal']) && !empty($filters['tanggal_akhir'])) {
            $query->whereBetween('created_at', [
                Carbon::parse($filters['tanggal_awal'])->startOfDay(),
                Carbon::parse($filters['tanggal_akhir'])->endOfDay(),
            ]);
        }

        return $query->latest('id_log')->paginate($perPage);
    }

    /**
     * Perform a manual stock adjustment (Stok Opname / Penyesuaian).
     */
    public function manualAdjustment(array $data, User $user): StokLog
    {
        return DB::transaction(function () use ($data, $user) {
            $barang = Barang::lockForUpdate()->find($data['id_barang']);

            if (!$barang) {
                throw ValidationException::withMessages([
                    'id_barang' => ['Barang tidak ditemukan.'],
                ]);
            }

            $stokBaru = (int) $data['stok_baru'];
            if ($stokBaru < 0) {
                throw ValidationException::withMessages([
                    'stok_baru' => ['Stok baru tidak boleh negatif.'],
                ]);
            }

            $stokSebelum = $barang->stok;
            $selisih = abs($stokBaru - $stokSebelum);

            $barang->update(['stok' => $stokBaru]);

            return StokLog::create([
                'id_barang' => $barang->id_barang,
                'jenis' => 'penyesuaian',
                'jumlah' => $selisih,
                'stok_sebelum' => $stokSebelum,
                'stok_sesudah' => $stokBaru,
                'referensi' => $data['referensi'] ?? 'OPNAME-' . date('Ymd'),
                'keterangan' => $data['keterangan'] ?? 'Penyesuaian stok fisik (Stock Opname)',
                'id_user' => $user->id_user,
                'created_at' => now(),
            ]);
        });
    }
}
