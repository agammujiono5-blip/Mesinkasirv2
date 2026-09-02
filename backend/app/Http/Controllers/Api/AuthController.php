<?php

namespace App\Http\Controllers\Api;

use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends BaseApiController
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'no_hp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:255',
            'role' => 'nullable|in:admin,kasir,pelanggan,owner,manager',
        ]);

        $result = $this->authService->register($validated);

        return $this->sendResponse($result, 'Pendaftaran pengguna berhasil.', 201);
    }

    /**
     * Login user.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => 'required|string',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->authService->login(
                $request->input('identifier'),
                $request->input('password')
            );

            return $this->sendResponse($result, 'Login berhasil.');
        } catch (ValidationException $e) {
            return $this->sendError('Login gagal.', $e->errors(), 422);
        }
    }

    /**
     * Get current authenticated user profile.
     */
    public function profile(Request $request): JsonResponse
    {
        return $this->sendResponse($request->user(), 'Data profil berhasil diambil.');
    }

    /**
     * Update user profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:100',
            'username' => "sometimes|required|string|max:50|unique:users,username,{$user->id_user},id_user",
            'email' => "sometimes|required|email|max:100|unique:users,email,{$user->id_user},id_user",
            'no_hp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string|max:255',
        ]);

        $updated = $this->authService->updateProfile($user, $validated);

        return $this->sendResponse($updated, 'Profil berhasil diperbarui.');
    }

    /**
     * Change user password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        try {
            $this->authService->changePassword(
                $request->user(),
                $request->input('current_password'),
                $request->input('new_password')
            );

            return $this->sendResponse(null, 'Password berhasil diubah.');
        } catch (ValidationException $e) {
            return $this->sendError('Gagal mengubah password.', $e->errors(), 422);
        }
    }

    /**
     * Logout user.
     */
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return $this->sendResponse(null, 'Logout berhasil.');
    }
}
