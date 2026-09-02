<?php

namespace App\Services;

use App\Models\Kategori;
use Illuminate\Database\Eloquent\Collection;

class KategoriService
{
    public function getAll(): Collection
    {
        return Kategori::withCount('barang')->get();
    }

    public function findById(int $id): Kategori
    {
        return Kategori::with('barang')->findOrFail($id);
    }

    public function create(array $data): Kategori
    {
        return Kategori::create([
            'nama_kategori' => $data['nama_kategori'],
        ]);
    }

    public function update(Kategori $kategori, array $data): Kategori
    {
        $kategori->update([
            'nama_kategori' => $data['nama_kategori'] ?? $kategori->nama_kategori,
        ]);

        return $kategori->fresh();
    }

    public function delete(Kategori $kategori): bool
    {
        return (bool) $kategori->delete();
    }
}
