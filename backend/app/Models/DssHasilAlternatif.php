<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DssHasilAlternatif extends Model
{
    use HasFactory;

    protected $table = 'dss_hasil_alternatif';

    protected $primaryKey = 'id_hasil';

    protected $fillable = [
        'id_analisis',
        'id_barang',
        'kode_alternatif',
        'nama_alternatif',
        'nilai_json',
        'normalisasi_json',
        'skor',
        'peringkat',
        'rekomendasi',
    ];

    protected function casts(): array
    {
        return [
            'nilai_json' => 'array',
            'normalisasi_json' => 'array',
            'skor' => 'float',
            'peringkat' => 'integer',
        ];
    }

    public function analisis()
    {
        return $this->belongsTo(DssAnalisis::class, 'id_analisis', 'id_analisis');
    }

    public function barang()
    {
        return $this->belongsTo(Barang::class, 'id_barang', 'id_barang');
    }
}
