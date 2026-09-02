<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class UserService
{
    /**
     * Get list of users with optional filtering.
     */
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = User::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('no_hp', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->latest('id_user')->paginate($perPage);
    }

    /**
     * Find user by ID.
     */
    public function findById(int $id): User
    {
        return User::findOrFail($id);
    }

    /**
     * Create a new user.
     */
    public function create(array $data): User
    {
        return User::create([
            'nama' => $data['nama'],
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => $data['password'],
            'no_hp' => $data['no_hp'] ?? null,
            'alamat' => $data['alamat'] ?? null,
            'role' => $data['role'] ?? 'pelanggan',
            'status' => $data['status'] ?? 'aktif',
        ]);
    }

    /**
     * Update user.
     */
    public function update(User $user, array $data): User
    {
        $updateData = [
            'nama' => $data['nama'] ?? $user->nama,
            'username' => $data['username'] ?? $user->username,
            'email' => $data['email'] ?? $user->email,
            'no_hp' => $data['no_hp'] ?? $user->no_hp,
            'alamat' => $data['alamat'] ?? $user->alamat,
            'role' => $data['role'] ?? $user->role,
            'status' => $data['status'] ?? $user->status,
        ];

        if (!empty($data['password'])) {
            $updateData['password'] = $data['password'];
        }

        $user->update($updateData);

        return $user->fresh();
    }

    /**
     * Delete user (soft delete).
     */
    public function delete(User $user): bool
    {
        return (bool) $user->delete();
    }
}
