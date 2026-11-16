<?php

namespace App\Services;

use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class KaryawanService
{
    /** Disk penyimpanan foto karyawan. */
    public const FOTO_DISK = 'public';

    /** Folder foto karyawan pada disk publik. */
    public const FOTO_FOLDER = 'karyawan';

    /**
     * Get list of karyawan with optional filtering.
     */
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Karyawan::query()->with('user:id_user,username,role,status');

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search): void {
                $q->where('nama_lengkap', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('no_telepon', 'like', "%{$search}%")
                    ->orWhere('jabatan', 'like', "%{$search}%")
                    ->orWhere('divisi', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['status_karyawan'])) {
            $query->where('status_karyawan', $filters['status_karyawan']);
        }

        if (! empty($filters['divisi'])) {
            $query->where('divisi', $filters['divisi']);
        }

        if (! empty($filters['jenis_kelamin'])) {
            $query->where('jenis_kelamin', $filters['jenis_kelamin']);
        }

        return $query->latest('id_karyawan')->paginate($perPage);
    }

    /**
     * Find karyawan by ID.
     */
    public function findById(int $id): Karyawan
    {
        return Karyawan::with('user:id_user,username,role,status')->findOrFail($id);
    }

    /**
     * Data karyawan milik user yang sedang login.
     */
    public function findByUser(User $user): ?Karyawan
    {
        return Karyawan::with('user:id_user,username,role,status')
            ->where('id_user', $user->id_user)
            ->first();
    }

    /**
     * Create a new karyawan.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?UploadedFile $foto = null): Karyawan
    {
        $data = $this->payload($data);

        if ($foto) {
            $data['foto'] = '/storage/'.$foto->store(self::FOTO_FOLDER, self::FOTO_DISK);
        }

        return Karyawan::create($data)->fresh('user');
    }

    /**
     * Update karyawan.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Karyawan $karyawan, array $data, ?UploadedFile $foto = null): Karyawan
    {
        $data = $this->payload($data);

        if ($foto) {
            $data['foto'] = $this->simpanFoto($foto, $karyawan->foto);
        } elseif (filter_var($data['hapus_foto'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $this->hapusBerkasFoto($karyawan->foto);
            $data['foto'] = null;
        }

        unset($data['hapus_foto']);

        // Akun login mengikuti status kepegawaian: nonaktif/cuti => akun nonaktif.
        if (isset($data['status_karyawan']) && $karyawan->id_user) {
            User::where('id_user', $karyawan->id_user)->update([
                'status' => $data['status_karyawan'] === 'aktif' ? 'aktif' : 'nonaktif',
            ]);
        }

        $karyawan->update($data);

        return $karyawan->fresh('user');
    }

    /**
     * Delete karyawan beserta berkas foto dan akun loginnya.
     */
    public function delete(Karyawan $karyawan): bool
    {
        return DB::transaction(function () use ($karyawan): bool {
            $this->hapusBerkasFoto($karyawan->foto);

            if ($karyawan->id_user) {
                User::where('id_user', $karyawan->id_user)->update(['status' => 'nonaktif']);
            }

            return (bool) $karyawan->delete();
        });
    }

    /**
     * Buat akun login (role karyawan) untuk data karyawan dan tautkan.
     *
     * @param  array{username: string, password: string, role: string}  $data
     */
    public function buatAkun(Karyawan $karyawan, array $data): Karyawan
    {
        if (! $karyawan->isAktif()) {
            throw ValidationException::withMessages([
                'status_karyawan' => ['Akun login hanya bisa dibuat untuk karyawan berstatus aktif.'],
            ]);
        }

        if ($karyawan->id_user) {
            throw ValidationException::withMessages([
                'id_user' => ['Karyawan ini sudah memiliki akun login.'],
            ]);
        }

        if (empty($karyawan->email)) {
            throw ValidationException::withMessages([
                'email' => ['Email karyawan wajib diisi sebelum membuat akun login.'],
            ]);
        }

        return DB::transaction(function () use ($karyawan, $data): Karyawan {
            $user = User::create([
                'nama' => $karyawan->nama_lengkap,
                'username' => $data['username'],
                'email' => $karyawan->email,
                'password' => Hash::make($data['password']),
                'no_hp' => $karyawan->no_telepon,
                'alamat' => Str::limit((string) $karyawan->alamat, 255),
                'role' => $data['role'],
                'status' => 'aktif',
            ]);

            $karyawan->update(['id_user' => $user->id_user]);

            return $karyawan->fresh('user');
        });
    }

    /**
     * Sinkronkan status akun login karyawan dengan status kepegawaiannya
     * (aktif => akun aktif, nonaktif/cuti => akun nonaktif).
     */
    public function sinkronkanStatusAkun(Karyawan $karyawan): Karyawan
    {
        if (! $karyawan->id_user) {
            throw ValidationException::withMessages([
                'id_user' => ['Karyawan ini belum memiliki akun login.'],
            ]);
        }

        User::where('id_user', $karyawan->id_user)
            ->update(['status' => $karyawan->isAktif() ? 'aktif' : 'nonaktif']);

        return $karyawan->fresh('user');
    }

    /**
     * Normalisasi payload: buang kunci yang tidak boleh diisi langsung dan
     * kosongkan string kosong menjadi NULL. Aturan otorisasi per-field
     * (jabatan, divisi, status, id_user) sudah diterapkan Controller.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function payload(array $data): array
    {
        unset($data['id_user'], $data['foto']);

        foreach (['nip', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'no_telepon', 'email', 'jabatan', 'divisi', 'tanggal_masuk'] as $kunci) {
            if (array_key_exists($kunci, $data) && $data[$kunci] === '') {
                $data[$kunci] = null;
            }
        }

        if (array_key_exists('nip', $data)) {
            $data['nip'] = $data['nip'] === null ? null : strtoupper(trim($data['nip']));
        }

        return $data;
    }

    private function simpanFoto(UploadedFile $foto, ?string $fotoLama): string
    {
        $path = $foto->store(self::FOTO_FOLDER, self::FOTO_DISK);
        $this->hapusBerkasFoto($fotoLama);

        return '/storage/'.$path;
    }

    private function hapusBerkasFoto(?string $foto): void
    {
        if (! $foto) {
            return;
        }

        $relative = str_starts_with($foto, '/storage/')
            ? substr($foto, strlen('/storage/'))
            : $foto;

        if (Storage::disk(self::FOTO_DISK)->exists($relative)) {
            Storage::disk(self::FOTO_DISK)->delete($relative);
        }
    }
}
