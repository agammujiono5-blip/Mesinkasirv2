<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EsRule extends Model
{
    use HasFactory;

    protected $table = 'es_rule';

    protected $primaryKey = 'id_rule';

    protected $fillable = [
        'kode_rule',
        'kode_kerusakan',
        'kode_gejala',
        'cf_pakar',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'cf_pakar' => 'float',
            'aktif' => 'boolean',
        ];
    }

    public function kerusakan(): BelongsTo
    {
        return $this->belongsTo(EsKerusakan::class, 'kode_kerusakan', 'kode_kerusakan');
    }

    public function gejala(): BelongsTo
    {
        return $this->belongsTo(EsGejala::class, 'kode_gejala', 'kode_gejala');
    }
}
