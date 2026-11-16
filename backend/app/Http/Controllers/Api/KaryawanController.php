<?php

namespace App\Http\Controllers\Api;

use App\Models\Karyawan;
use App\Services\KaryawanService;
use App\Support\RoleAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KaryawanController extends BaseApiController
{
    public function __construct(protected KaryawanService $karyawanService) {}

    /**
     * Daftar karyawan (admin, manager).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'status_karyawan', 'divisi', 'jenis_kelamin']);
        $perPage = (int) $request->get('per_page', 15);

        $karyawan = $this->karyawanService->getAll($filters, $perPage);

        return $this->sendResponse($karyawan, 'Daftar karyawan berhasil diambil.');
    }

    /**
     * Detail karyawan (admin, manager).
     */
    public function show(int $id): JsonResponse
    {
        $karyawan = $this->karyawanService->findById($id);

        return $this->sendResponse($karyawan, 'Detail karyawan berhasil diambil.');
    }

    /**
     * Profil kepegawaian milik user yang sedang login.
     */
    public function me(Request $request): JsonResponse
    {
        $karyawan = $this->karyawanService->findByUser($request->user());

        return $this->sendResponse($karyawan, 'Data kepegawaian berhasil diambil.');
    }

    /**
     * Tambah karyawan (admin, manager).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        // Jabatan/divisi hanya boleh diisi admin saat pembuatan awal.
        if (! $request->user()->hasRole(...RoleAccess::KARYAWAN_AKUN)) {
            unset($validated['jabatan'], $validated['divisi']);
        }

        $karyawan = $this->karyawanService->create($validated, $request->file('foto'));

        return $this->sendResponse($karyawan, 'Karyawan berhasil ditambahkan.', 201);
    }

    /**
     * Ubah data karyawan (admin, manager).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $karyawan = $this->karyawanService->findById($id);

        $validated = $request->validate($this->rules($karyawan));

        // Manager tidak boleh mengubah jabatan, divisi, dan status kepegawaian;
        // perubahan status dilakukan admin melalui endpoint /status.
        if (! $request->user()->hasRole(...RoleAccess::KARYAWAN_AKUN)) {
            unset($validated['jabatan'], $validated['divisi'], $validated['status_karyawan']);
        }

        $updated = $this->karyawanService->update($karyawan, $validated, $request->file('foto'));

        return $this->sendResponse($updated, 'Karyawan berhasil diperbarui.');
    }

    /**
     * Hapus karyawan (admin saja).
     */
    public function destroy(int $id): JsonResponse
    {
        $karyawan = $this->karyawanService->findById($id);
        $this->karyawanService->delete($karyawan);

        return $this->sendResponse(null, 'Karyawan berhasil dihapus.');
    }

    /**
     * Ubah status kepegawaian (admin saja) — akun login ikut disesuaikan.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $karyawan = $this->karyawanService->findById($id);

        $validated = $request->validate([
            'status_karyawan' => 'required|in:'.implode(',', Karyawan::STATUS),
        ]);

        $updated = $this->karyawanService->update($karyawan, $validated);

        return $this->sendResponse($updated, 'Status karyawan berhasil diperbarui.');
    }

    /**
     * Buat akun login karyawan (admin saja).
     */
    public function buatAkun(Request $request, int $id): JsonResponse
    {
        $karyawan = $this->karyawanService->findById($id);

        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users,username',
            'password' => 'required|string|min:6',
            'role' => ['required', Rule::in(RoleAccess::KARYAWAN_ROLE_AKUN)],
        ]);

        // Akun berjabatan lebih tinggi (mis. manager) hanya boleh dibuat oleh
        // role yang berhak mengelola akun tersebut.
        if (! $request->user()->bolehKelolaAkun($validated['role'])) {
            return $this->sendError('Akses ditolak. Anda tidak berhak membuat akun dengan role ini.', [], 403);
        }

        $updated = $this->karyawanService->buatAkun($karyawan, $validated);

        return $this->sendResponse($updated, 'Akun login karyawan berhasil dibuat.', 201);
    }

    /**
     * Sinkronkan status akun login dengan status kepegawaian (admin saja).
     */
    public function sinkronkanAkun(int $id): JsonResponse
    {
        $karyawan = $this->karyawanService->findById($id);
        $updated = $this->karyawanService->sinkronkanStatusAkun($karyawan);

        return $this->sendResponse($updated, 'Status akun login karyawan berhasil disinkronkan.');
    }

    /**
     * Aturan validasi data kepegawaian.
     *
     * @return array<string, mixed>
     */
    private function rules(?Karyawan $karyawan = null): array
    {
        $wajib = $karyawan ? 'sometimes|required' : 'required';
        $unikNip = Rule::unique('karyawan', 'nip')->ignore($karyawan?->id_karyawan, 'id_karyawan');

        return [
            'nip' => ['nullable', 'string', 'max:30', $unikNip],
            'nama_lengkap' => "{$wajib}|string|max:150",
            'email' => ['nullable', 'email', 'max:100', ...$this->emailUnikRules($karyawan)],
            'jenis_kelamin' => 'nullable|in:'.implode(',', Karyawan::JENIS_KELAMIN),
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date|before:today',
            'alamat' => 'nullable|string',
            'no_telepon' => 'nullable|string|max:20',
            'jabatan' => 'nullable|string|max:100',
            'divisi' => 'nullable|string|max:100',
            'tanggal_masuk' => 'nullable|date',
            'status_karyawan' => 'sometimes|required|in:'.implode(',', Karyawan::STATUS),
            'foto' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
            'hapus_foto' => 'nullable|boolean',
        ];
    }

    /**
     * Email karyawan harus unik pada tabel karyawan dan (jika sudah punya akun)
     * tidak boleh sama dengan email akun login lain.
     *
     * @return array<int, mixed>
     */
    private function emailUnikRules(?Karyawan $karyawan): array
    {
        return [
            Rule::unique('karyawan', 'email')->ignore($karyawan?->id_karyawan, 'id_karyawan'),
            Rule::unique('users', 'email')->ignore($karyawan?->id_user, 'id_user'),
        ];
    }
}
