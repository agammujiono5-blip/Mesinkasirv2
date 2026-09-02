<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\Kategori;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Users
        $admin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'nama' => 'Administrator',
                'email' => 'admin@pos.local',
                'password' => Hash::make('password123'),
                'no_hp' => '081234567890',
                'alamat' => 'Kantor Pusat',
                'role' => 'admin',
                'status' => 'aktif',
            ]
        );

        $kasir = User::firstOrCreate(
            ['username' => 'kasir1'],
            [
                'nama' => 'Kasir Utama',
                'email' => 'kasir@pos.local',
                'password' => Hash::make('password123'),
                'no_hp' => '081234567891',
                'alamat' => 'Kasir Stand 1',
                'role' => 'kasir',
                'status' => 'aktif',
            ]
        );

        $pelanggan = User::firstOrCreate(
            ['username' => 'pelanggan1'],
            [
                'nama' => 'Pelanggan Umum',
                'email' => 'pelanggan@pos.local',
                'password' => Hash::make('password123'),
                'no_hp' => '081234567892',
                'alamat' => 'Jl. Merdeka No. 10',
                'role' => 'pelanggan',
                'status' => 'aktif',
            ]
        );

        // 2. Permissions
        $permissionsList = [
            ['kode_permission' => 'manage_users', 'deskripsi' => 'Kelola data pengguna dan akun'],
            ['kode_permission' => 'manage_barang', 'deskripsi' => 'Kelola data barang dan harga'],
            ['kode_permission' => 'manage_kategori', 'deskripsi' => 'Kelola kategori barang'],
            ['kode_permission' => 'manage_supplier', 'deskripsi' => 'Kelola data pemasok / supplier'],
            ['kode_permission' => 'manage_diskon', 'deskripsi' => 'Kelola promo dan diskon'],
            ['kode_permission' => 'create_transaksi', 'deskripsi' => 'Melakukan transaksi penjualan kasir'],
            ['kode_permission' => 'view_transaksi', 'deskripsi' => 'Melihat riwayat transaksi penjualan'],
            ['kode_permission' => 'manage_pembelian', 'deskripsi' => 'Melakukan restok dan pembelian dari supplier'],
            ['kode_permission' => 'manage_stok', 'deskripsi' => 'Audit riwayat dan penyesuaian stok opname'],
            ['kode_permission' => 'view_dashboard', 'deskripsi' => 'Melihat statistik ringkasan dan dashboard'],
        ];

        foreach ($permissionsList as $pData) {
            $perm = Permission::firstOrCreate(
                ['kode_permission' => $pData['kode_permission']],
                ['deskripsi' => $pData['deskripsi']]
            );

            // Give admin all permissions
            RolePermission::firstOrCreate([
                'role' => 'admin',
                'id_permission' => $perm->id_permission,
            ]);

            // Give kasir cashier-specific permissions
            if (in_array($pData['kode_permission'], ['create_transaksi', 'view_transaksi', 'view_dashboard'])) {
                RolePermission::firstOrCreate([
                    'role' => 'kasir',
                    'id_permission' => $perm->id_permission,
                ]);
            }
        }

        // 3. Kategori
        $katMakanan = Kategori::firstOrCreate(['nama_kategori' => 'Makanan & Minuman']);
        $katElektronik = Kategori::firstOrCreate(['nama_kategori' => 'Elektronik & Gadget']);
        $katAlatTulis = Kategori::firstOrCreate(['nama_kategori' => 'Alat Tulis & Kantor']);

        // 4. Supplier
        $sup1 = Supplier::firstOrCreate(
            ['nama_supplier' => 'PT Sumber Makmur Sejahtera'],
            [
                'kontak' => '081122334455',
                'alamat' => 'Kawasan Industri Rungkut, Surabaya',
                'email' => 'sales@sumbermakmur.com',
            ]
        );

        $sup2 = Supplier::firstOrCreate(
            ['nama_supplier' => 'CV Berkah Distribusi Utama'],
            [
                'kontak' => '082233445566',
                'alamat' => 'Jl. Gatot Subroto No. 45, Jakarta Selatan',
                'email' => 'info@berkahdistribusi.com',
            ]
        );

        // 5. Barang
        Barang::firstOrCreate(
            ['kode_barang' => 'BRG-001'],
            [
                'id_kategori' => $katMakanan->id_kategori,
                'id_supplier' => $sup1->id_supplier,
                'nama_barang' => 'Kopi Arabika Premium 250g',
                'deskripsi' => 'Biji kopi sangrai pilihan nusantara',
                'harga_beli' => 35000,
                'harga_jual' => 50000,
                'stok' => 100,
                'stok_minimum' => 10,
                'satuan' => 'pack',
            ]
        );

        Barang::firstOrCreate(
            ['kode_barang' => 'BRG-002'],
            [
                'id_kategori' => $katElektronik->id_kategori,
                'id_supplier' => $sup2->id_supplier,
                'nama_barang' => 'Wireless Mouse Ergonomic',
                'deskripsi' => 'Mouse nirkabel 2.4GHz sensor presisi',
                'harga_beli' => 75000,
                'harga_jual' => 120000,
                'stok' => 50,
                'stok_minimum' => 5,
                'satuan' => 'unit',
            ]
        );

        Barang::firstOrCreate(
            ['kode_barang' => 'BRG-003'],
            [
                'id_kategori' => $katAlatTulis->id_kategori,
                'id_supplier' => $sup1->id_supplier,
                'nama_barang' => 'Buku Catatan Hardcover A5',
                'deskripsi' => 'Notebook 100 lembar kertas bookpaper',
                'harga_beli' => 15000,
                'harga_jual' => 25000,
                'stok' => 200,
                'stok_minimum' => 20,
                'satuan' => 'pcs',
            ]
        );
    }
}
