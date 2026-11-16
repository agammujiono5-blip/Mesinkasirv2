<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EsKerusakan extends Model
{
    use HasFactory;

    protected $table = 'es_kerusakan';

    protected $primaryKey = 'id_kerusakan';

    protected $fillable = [
        'kode_kerusakan',
        'nama_kerusakan',
        'kategori',
        'deskripsi',
        'solusi',
        'tingkat_urgensi',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'aktif' => 'boolean',
        ];
    }

    public function rules(): HasMany
    {
        return $this->hasMany(EsRule::class, 'kode_kerusakan', 'kode_kerusakan');
    }

    public function diagnosa(): HasMany
    {
        return $this->hasMany(EsDiagnosa::class, 'kode_kerusakan', 'kode_kerusakan');
    }
}
