<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class SupplierService
{
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Supplier::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nama_supplier', 'like', "%{$search}%")
                    ->orWhere('kontak', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->latest('id_supplier')->paginate($perPage);
    }

    public function getAllList(): Collection
    {
        return Supplier::all();
    }

    public function findById(int $id): Supplier
    {
        return Supplier::with(['barang', 'pembelian'])->findOrFail($id);
    }

    public function create(array $data): Supplier
    {
        return Supplier::create([
            'nama_supplier' => $data['nama_supplier'],
            'kontak' => $data['kontak'] ?? null,
            'alamat' => $data['alamat'] ?? null,
            'email' => $data['email'] ?? null,
        ]);
    }

    public function update(Supplier $supplier, array $data): Supplier
    {
        $supplier->update([
            'nama_supplier' => $data['nama_supplier'] ?? $supplier->nama_supplier,
            'kontak' => $data['kontak'] ?? $supplier->kontak,
            'alamat' => $data['alamat'] ?? $supplier->alamat,
            'email' => $data['email'] ?? $supplier->email,
        ]);

        return $supplier->fresh();
    }

    public function delete(Supplier $supplier): bool
    {
        return (bool) $supplier->delete();
    }
}
