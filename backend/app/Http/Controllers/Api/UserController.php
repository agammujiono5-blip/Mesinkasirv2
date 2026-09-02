<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends BaseApiController
{
    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'role', 'status']);
        $perPage = (int) $request->get('per_page', 15);
        $users = $this->userService->getAll($filters, $perPage);

        return $this->sendResponse($users, 'Daftar pengguna berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:6',
            'no_hp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:255',
            'role' => 'required|in:admin,kasir,pelanggan,owner,manager',
            'status' => 'nullable|in:aktif,nonaktif',
        ]);

        $user = $this->userService->create($validated);

        return $this->sendResponse($user, 'Pengguna berhasil dibuat.', 201);
    }

    public function show(int $id): JsonResponse
    {
        $user = $this->userService->findById($id);

        return $this->sendResponse($user, 'Detail pengguna berhasil diambil.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $this->userService->findById($id);

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:100',
            'username' => "sometimes|required|string|max:50|unique:users,username,{$user->id_user},id_user",
            'email' => "sometimes|required|email|max:100|unique:users,email,{$user->id_user},id_user",
            'password' => 'nullable|string|min:6',
            'no_hp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:255',
            'role' => 'sometimes|required|in:admin,kasir,pelanggan,owner,manager',
            'status' => 'sometimes|required|in:aktif,nonaktif',
        ]);

        $updated = $this->userService->update($user, $validated);

        return $this->sendResponse($updated, 'Pengguna berhasil diperbarui.');
    }

    public function destroy(int $id): JsonResponse
    {
        $user = $this->userService->findById($id);
        $this->userService->delete($user);

        return $this->sendResponse(null, 'Pengguna berhasil dihapus.');
    }
}
