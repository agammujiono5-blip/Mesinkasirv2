<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EsGejala extends Model
{
    use HasFactory;

    protected $table = 'es_gejala';

    protected $primaryKey = 'id_gejala';

    protected $fillable = [
        'kode_gejala',
        'nama_gejala',
        'kelompok',
        'deskripsi',
        'urutan',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'urutan' => 'integer',
            'aktif' => 'boolean',
        ];
    }

    public function rules(): HasMany
    {
        return $this->hasMany(EsRule::class, 'kode_gejala', 'kode_gejala');
    }
}
