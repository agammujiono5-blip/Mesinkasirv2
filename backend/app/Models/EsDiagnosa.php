<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EsDiagnosa extends Model
{
    use HasFactory;

    protected $table = 'es_diagnosa';

    protected $primaryKey = 'id_diagnosa';

    protected $fillable = [
        'kode_diagnosa',
        'kode_kerusakan',
        'kategori',
        'cf_akhir',
        'persentase',
        'tingkat_keyakinan',
        'hasil',
        'gejala_json',
        'kerusakan_teridentifikasi_json',
        'kandidat_json',
        'langkah_inferensi_json',
        'catatan',
        'id_user',
    ];

    /**
     * Default nilai hasil diagnosa.
     *
     * Disimpan di model (bukan default kolom) karena MySQL menolak default string
     * panjang pada kolom non-NULL saat tabel dibuat.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'cf_akhir' => 0,
        'persentase' => '0%',
        'tingkat_keyakinan' => 'tidak diketahui',
        'hasil' => 'tidak_teridentifikasi',
    ];

    protected function casts(): array
    {
        return [
            'cf_akhir' => 'float',
            'gejala_json' => 'array',
            'kerusakan_teridentifikasi_json' => 'array',
            'kandidat_json' => 'array',
            'langkah_inferensi_json' => 'array',
        ];
    }

    public function kerusakan(): BelongsTo
    {
        return $this->belongsTo(EsKerusakan::class, 'kode_kerusakan', 'kode_kerusakan');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
