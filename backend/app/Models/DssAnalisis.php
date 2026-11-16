<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DssAnalisis extends Model
{
    use HasFactory;

    protected $table = 'dss_analisis';

    protected $primaryKey = 'id_analisis';

    protected $fillable = [
        'kode_analisis',
        'judul',
        'metode',
        'periode',
        'periode_awal',
        'periode_akhir',
        'total_alternatif',
        'total_kriteria',
        'kriteria_json',
        'bobot_json',
        'sumber_data_json',
        'alternatif_terbaik',
        'skor_tertinggi',
        'status',
        'catatan',
        'id_user',
    ];

    protected function casts(): array
    {
        return [
            'kriteria_json' => 'array',
            'bobot_json' => 'array',
            'sumber_data_json' => 'array',
            'skor_tertinggi' => 'float',
            'total_alternatif' => 'integer',
            'total_kriteria' => 'integer',
            'periode_awal' => 'date',
            'periode_akhir' => 'date',
        ];
    }

    public function hasil()
    {
        return $this->hasMany(DssHasilAlternatif::class, 'id_analisis', 'id_analisis')
            ->orderBy('peringkat');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
