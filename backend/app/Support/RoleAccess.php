<?php

namespace App\Support;

use App\Models\User;

/**
 * Matriks akses modul informasi (MIS, DSS, ES) per role.
 *
 * Satu sumber kebenaran untuk otorisasi: dipakai oleh middleware `role`,
 * service, dan (melalui payload pada endpoint profil) oleh UI agar menu yang
 * tampil selalu sama dengan yang diizinkan server.
 *
 * Hak akses modul:
 * - MIS (laporan & analitik eksekutif): manager saja.
 * - DSS (analisis keputusan SAW): manager saja.
 * - ES (sistem pakar): manager saja.
 * - Karyawan (kepegawaian): admin, manager — manager hanya boleh mengelola
 *   data kepegawaian, hanya admin yang boleh membuat akun login dan mengubah
 *   jabatan/divisi serta menonaktifkan karyawan.
 * - Pengguna: owner mengelola semua akun; admin hanya boleh mengelola akun
 *   berperingkat di bawahnya (kasir, pelanggan) dan tidak dapat mengubah atau
 *   menghapus akun manager/owner.
 * - Dashboard ringkasan: kasir hanya melihat ringkasan penjualan, sedangkan
 *   data bisnis (laba, pengadaan, pelanggan, produk terlaris) hanya untuk
 *   admin, owner, dan manager.
 */
class RoleAccess
{
    /** Seluruh role yang dikenal aplikasi. */
    public const ROLES = ['admin', 'owner', 'manager', 'kasir', 'pelanggan'];

    /** Role yang boleh membuka modul MIS (laporan eksekutif). Khusus manager. */
    public const MIS = ['manager'];

    /** Role yang boleh membuka modul DSS. Khusus manager. */
    public const DSS = ['manager'];

    /** Role yang boleh menjalankan analisis DSS dan menyimpan riwayat. Khusus manager. */
    public const DSS_ANALYZE = ['manager'];

    /** Role yang boleh mengubah bobot/kriteria DSS. Khusus manager. */
    public const DSS_CRITERIA = ['manager'];

    /** Role yang boleh membuka modul ES. Khusus manager. */
    public const ES = ['manager'];

    /** Role yang boleh menyimpan hasil diagnosa ES. Khusus manager. */
    public const ES_DIAGNOSE = ['manager'];

    /** Role yang boleh melihat data operasional lengkap (dashboard, transaksi, stok). */
    public const OPERASIONAL = ['admin', 'owner', 'manager', 'kasir'];

    /** Role yang boleh mengelola data kepegawaian (CRUD karyawan). */
    public const KARYAWAN = ['admin', 'manager'];

    /** Role yang boleh membuat/menautkan akun login, mengubah jabatan, dan status karyawan. */
    public const KARYAWAN_AKUN = ['admin'];

    /** Role akun login yang boleh diciptakan dari data karyawan. */
    public const KARYAWAN_ROLE_AKUN = ['kasir', 'manager'];

    /**
     * Peringkat jabatan (semakin besar semakin tinggi). Dipakai agar akun
     * berperingkat rendah tidak dapat mengubah/menghapus akun berperingkat
     * lebih tinggi, misalnya admin biasa terhadap manager.
     */
    public const PERINGKAT = [
        'pelanggan' => 10,
        'kasir' => 20,
        'admin' => 30,
        'manager' => 40,
        'owner' => 50,
    ];

    /** Role yang tidak boleh dibuat/diubah/dihapus oleh admin biasa. */
    public const TARGET_TERLINDUNGI = ['manager', 'owner'];

    /** Role yang boleh membuka dashboard ringkasan (admin meter ketat). */
    public const DASHBOARD = ['admin', 'owner', 'manager', 'kasir'];

    /** Role yang boleh melihat ringkasan bisnis (laba, pembelian, pelanggan, produk terlaris). */
    public const DASHBOARD_BISNIS = ['admin', 'owner', 'manager'];

    /** Role yang boleh melihat nomor/jumlah pesanan di dashboard ringkasan. */
    public const DASHBOARD_PESANAN = ['admin', 'owner', 'manager', 'kasir'];

    /** Role yang boleh membuka halaman pengguna. */
    public const MANAGE_USERS = ['admin', 'owner'];

    /**
     * Peringkat jabatan sebuah role.
     */
    public static function peringkat(?string $role): int
    {
        return self::PERINGKAT[$role] ?? 0;
    }

    /**
     * Apakah `$aktor` boleh mengelola (ubah/hapus) akun dengan role `$target`.
     *
     * Admin biasa tidak dapat mengelola manager/owner; keputusan itu milik
     * owner. Akun dengan peringkat lebih tinggi juga tidak boleh disentuh
     * aktor berperingkat rendah.
     */
    public static function bolehKelolaAkun(User $aktor, string $roleTarget): bool
    {
        if ($aktor->id_user && $aktor->role === $roleTarget && ! $aktor->hasRole('owner')) {
            return false;
        }

        if (! $aktor->hasRole('owner') && in_array($roleTarget, self::TARGET_TERLINDUNGI, true)) {
            return false;
        }

        return self::peringkat($aktor->role) > self::peringkat($roleTarget)
            || ($aktor->role === 'owner' && $roleTarget !== 'owner');
    }

    /**
     * Apakah role termasuk daftar role yang diizinkan.
     *
     * @param  array<int, string>  $roles
     */
    public static function allows(?string $role, array $roles): bool
    {
        return $role !== null && in_array($role, $roles, true);
    }
}
