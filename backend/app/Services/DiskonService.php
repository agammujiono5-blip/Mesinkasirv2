<?php

namespace App\Services;

use App\Models\Diskon;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DiskonService
{
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Diskon::with('barang');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where('nama_diskon', 'like', "%{$search}%");
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest('id_diskon')->paginate($perPage);
    }

    public function getActiveDiscounts(): Collection
    {
        $today = Carbon::today()->toDateString();

        return Diskon::with('barang')
            ->where('status', 'aktif')
            ->where('tanggal_mulai', '<=', $today)
            ->where('tanggal_selesai', '>=', $today)
            ->get();
    }

    public function findById(int $id): Diskon
    {
        return Diskon::with('barang')->findOrFail($id);
    }

    public function create(array $data): Diskon
    {
        return Diskon::create($data);
    }

    public function update(Diskon $diskon, array $data): Diskon
    {
        $diskon->update($data);

        return $diskon->fresh('barang');
    }

    public function delete(Diskon $diskon): bool
    {
        return (bool) $diskon->delete();
    }
}
