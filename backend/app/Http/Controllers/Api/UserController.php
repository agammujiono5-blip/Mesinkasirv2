<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Services\UserService;
use App\Support\RoleAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends BaseApiController
{
    public function __construct(protected UserService $userService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'role', 'status']);
        $perPage = (int) $request->get('per_page', 15);

        $users = $this->userService->getAll($filters, $perPage);
        $aktor = $request->user();

        // Tandai akun mana yang boleh dikelola agar UI menyembunyikan aksi.
        $users->getCollection()->each(function (User $user) use ($aktor): void {
            $user->setAttribute('boleh_dikelola', $aktor->bolehKelolaAkun($user->role));
        });

        return $this->sendResponse($users, 'Daftar pengguna berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $aktor = $request->user();

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:6',
            'no_hp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:255',
            'role' => ['required', 'in:'.implode(',', RoleAccess::ROLES)],
            'status' => 'nullable|in:aktif,nonaktif',
        ]);

        $this->pastikanBolehKelola($aktor, $validated['role']);

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
        $aktor = $request->user();
        $user = $this->userService->findById($id);
        $this->pastikanBolehKelola($aktor, $user->role);

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:100',
            'username' => "sometimes|required|string|max:50|unique:users,username,{$user->id_user},id_user",
            'email' => "sometimes|required|email|max:100|unique:users,email,{$user->id_user},id_user",
            'password' => 'nullable|string|min:6',
            'no_hp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:255',
            'role' => ['sometimes', 'required', Rule::in(RoleAccess::ROLES)],
            'status' => 'sometimes|required|in:aktif,nonaktif',
        ]);

        // Role tujuan juga harus boleh diberikan oleh aktor (tidak boleh naik
        // pangkat ke role yang terlindungi/permanen lebih tinggi).
        if (isset($validated['role'])) {
            $this->pastikanBolehKelola($aktor, $validated['role']);
        }

        // Admin tidak boleh menonaktifkan akun manager/owner.
        if (isset($validated['status']) && $validated['status'] !== 'aktif') {
            $this->pastikanBolehKelola($aktor, $user->role);
        }

        $updated = $this->userService->update($user, $validated);

        return $this->sendResponse($updated, 'Pengguna berhasil diperbarui.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $aktor = $request->user();
        $user = $this->userService->findById($id);
        $this->pastikanBolehKelola($aktor, $user->role);

        $this->userService->delete($user);

        return $this->sendResponse(null, 'Pengguna berhasil dihapus.');
    }

    /**
     * Tolak aksi bila akun dengan role $roleTarget tidak boleh dikelola aktor.
     */
    private function pastikanBolehKelola(User $aktor, string $roleTarget): void
    {
        if (! $aktor->bolehKelolaAkun($roleTarget)) {
            abort(403, 'Akses ditolak. Akun dengan jabatan lebih tinggi tidak dapat diubah atau dihapus.');
        }
    }
}
