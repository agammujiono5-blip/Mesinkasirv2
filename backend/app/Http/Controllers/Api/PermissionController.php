<?php

namespace App\Http\Controllers\Api;

use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends BaseApiController
{
    protected PermissionService $permissionService;

    public function __construct(PermissionService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    public function index(): JsonResponse
    {
        $permissions = $this->permissionService->getAllPermissions();

        return $this->sendResponse($permissions, 'Daftar permission berhasil diambil.');
    }

    public function getByRole(string $role): JsonResponse
    {
        $rolePermissions = $this->permissionService->getRolePermissions($role);

        return $this->sendResponse($rolePermissions, "Permission untuk role {$role} berhasil diambil.");
    }

    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => 'required|in:admin,kasir,pelanggan,owner,manager',
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id_permission',
        ]);

        $synced = $this->permissionService->syncRolePermissions(
            $validated['role'],
            $validated['permission_ids']
        );

        return $this->sendResponse($synced, 'Permission role berhasil diperbarui.');
    }
}
