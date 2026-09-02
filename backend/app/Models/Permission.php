<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasFactory;

    protected $table = 'permissions';
    protected $primaryKey = 'id_permission';

    protected $fillable = [
        'kode_permission',
        'deskripsi',
    ];

    public function rolePermissions()
    {
        return $this->hasMany(RolePermission::class, 'id_permission', 'id_permission');
    }
}
