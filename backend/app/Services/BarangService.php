<?php

namespace App\Services;

use App\Models\Barang;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BarangService
{
    /**
     * Get paginated barang with search and filters.
     */
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Barang::with(['kategori', 'supplier', 'diskon']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nama_barang', 'like', "%{$search}%")
                    ->orWhere('kode_barang', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['id_kategori'])) {
            $query->where('id_kategori', $filters['id_kategori']);
        }

        if (!empty($filters['id_supplier'])) {
            $query->where('id_supplier', $filters['id_supplier']);
        }

        if (isset($filters['stok_menipis']) && $filters['stok_menipis']) {
            $query->whereColumn('stok', '<=', 'stok_minimum');
        }

        return $query->latest('id_barang')->paginate($perPage);
    }

    /**
     * Get all items reaching or below minimum stock.
     */
    public function getLowStockItems(): Collection
    {
        return Barang::with(['kategori', 'supplier'])
            ->whereColumn('stok', '<=', 'stok_minimum')
            ->get();
    }

    /**
     * Find barang by ID.
     */
    public function findById(int $id): Barang
    {
        return Barang::with(['kategori', 'supplier', 'diskon', 'stokLogs'])->findOrFail($id);
    }

    /**
     * Create a new barang.
     */
    public function create(array $data, ?UploadedFile $gambar = null): Barang
    {
        if (empty($data['kode_barang'])) {
            $data['kode_barang'] = 'BRG-' . strtoupper(Str::random(6));
        }

        if ($gambar) {
            $path = $gambar->store('barang', 'public');
            $data['gambar'] = '/storage/' . $path;
        }

        return Barang::create($data);
    }

    /**
     * Update an existing barang.
     */
    public function update(Barang $barang, array $data, ?UploadedFile $gambar = null): Barang
    {
        if ($gambar) {
            if ($barang->gambar && Storage::disk('public')->exists(str_replace('/storage/', '', $barang->gambar))) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $barang->gambar));
            }
            $path = $gambar->store('barang', 'public');
            $data['gambar'] = '/storage/' . $path;
        } elseif (!empty($data['hapus_gambar']) && filter_var($data['hapus_gambar'], FILTER_VALIDATE_BOOLEAN)) {
            if ($barang->gambar && Storage::disk('public')->exists(str_replace('/storage/', '', $barang->gambar))) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $barang->gambar));
            }
            $data['gambar'] = null;
        } else {
            unset($data['gambar']);
        }

        unset($data['hapus_gambar']);

        $barang->update($data);

        return $barang->fresh(['kategori', 'supplier']);
    }

    /**
     * Delete barang.
     */
    public function delete(Barang $barang): bool
    {
        return (bool) $barang->delete();
    }
}
