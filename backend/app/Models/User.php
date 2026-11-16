<?php

namespace App\Models;

use App\Support\RoleAccess;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $primaryKey = 'id_user';

    protected $fillable = [
        'nama',
        'username',
        'email',
        'password',
        'no_hp',
        'alamat',
        'role',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'role', 'role');
    }

    public function hasRole(string ...$roles): bool
    {
        return RoleAccess::allows($this->role, $roles);
    }

    /**
     * Akses modul informasi (MIS/DSS/ES) untuk user ini.
     *
     * @return array<string, bool>
     */
    public function moduleAccess(): array
    {
        return [
            'mis' => $this->hasRole(...RoleAccess::MIS),
            'dss' => $this->hasRole(...RoleAccess::DSS),
            'dss_analyze' => $this->hasRole(...RoleAccess::DSS_ANALYZE),
            'dss_criteria' => $this->hasRole(...RoleAccess::DSS_CRITERIA),
            'es' => $this->hasRole(...RoleAccess::ES),
            'es_diagnose' => $this->hasRole(...RoleAccess::ES_DIAGNOSE),
            'karyawan' => $this->hasRole(...RoleAccess::KARYAWAN),
            'karyawan_akun' => $this->hasRole(...RoleAccess::KARYAWAN_AKUN),
            'manage_users' => $this->hasRole(...RoleAccess::MANAGE_USERS),
        ];
    }

    public function karyawan(): HasOne
    {
        return $this->hasOne(Karyawan::class, 'id_user', 'id_user');
    }

    public function peringkat(): int
    {
        return RoleAccess::peringkat($this->role);
    }

    /**
     * Apakah user ini boleh mengelola (ubah/hapus) akun lain dengan role tertentu.
     */
    public function bolehKelolaAkun(string $roleTarget): bool
    {
        return RoleAccess::bolehKelolaAkun($this, $roleTarget);
    }

    /**
     * Daftar role yang boleh dibuat/diberikan oleh user ini.
     *
     * @return array<int, string>
     */
    public function roleYangBolehDikelola(): array
    {
        return array_values(array_filter(
            RoleAccess::ROLES,
            fn (string $role): bool => $this->bolehKelolaAkun($role)
        ));
    }

    /**
     * Daftar kode_permission milik role user ini.
     *
     * @return array<int, string>
     */
    public function permissionCodes(): array
    {
        return RolePermission::query()
            ->where('role', $this->role)
            ->with('permission:id_permission,kode_permission')
            ->get()
            ->pluck('permission.kode_permission')
            ->filter()
            ->values()
            ->all();
    }
}
