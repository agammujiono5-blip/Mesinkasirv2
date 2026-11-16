<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DssKriteria extends Model
{
    use HasFactory;

    protected $table = 'dss_kriteria';

    protected $primaryKey = 'id_kriteria';

    protected $fillable = [
        'kode_kriteria',
        'nama_kriteria',
        'deskripsi',
        'jenis',
        'bobot',
        'satuan',
        'urutan',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'bobot' => 'float',
            'urutan' => 'integer',
            'aktif' => 'boolean',
        ];
    }
}
