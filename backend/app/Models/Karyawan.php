<?php

namespace App\Models;

use Database\Factories\KaryawanFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Karyawan extends Model
{
    /** @use HasFactory<KaryawanFactory> */
    use HasFactory;

    public const JENIS_KELAMIN = ['L', 'P'];

    public const STATUS = ['aktif', 'nonaktif', 'cuti'];

    protected $table = 'karyawan';

    protected $primaryKey = 'id_karyawan';

    protected $fillable = [
        'nip',
        'nama_lengkap',
        'jenis_kelamin',
        'tempat_lahir',
        'tanggal_lahir',
        'alamat',
        'no_telepon',
        'email',
        'jabatan',
        'divisi',
        'tanggal_masuk',
        'status_karyawan',
        'foto',
        'id_user',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal_lahir' => 'date',
            'tanggal_masuk' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    /**
     * Apakah karyawan ini berstatus aktif dan boleh diberi akses login.
     */
    public function isAktif(): bool
    {
        return $this->status_karyawan === 'aktif';
    }
}
