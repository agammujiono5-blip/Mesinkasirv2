<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\RolePermission;
use Illuminate\Database\Eloquent\Collection;

class PermissionService
{
    public function getAllPermissions(): Collection
    {
        return Permission::all();
    }

    public function getRolePermissions(string $role): Collection
    {
        return RolePermission::where('role', $role)->with('permission')->get();
    }

    public function syncRolePermissions(string $role, array $permissionIds): array
    {
        RolePermission::where('role', $role)->delete();

        $records = [];
        foreach ($permissionIds as $pId) {
            $records[] = RolePermission::create([
                'role' => $role,
                'id_permission' => $pId,
            ]);
        }

        return $records;
    }
}
