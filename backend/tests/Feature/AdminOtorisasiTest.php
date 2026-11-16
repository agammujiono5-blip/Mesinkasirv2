<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Karyawan;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Batas wewenang admin terhadap akun berjabatan lebih tinggi (manager/owner)
 * dan pembatasan data dashboard ringkasan.
 */
class AdminOtorisasiTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        // Username/email disesuaikan agar tidak bentrok dengan akun seeder.
        return User::firstOrCreate(
            ['username' => "uji-{$role}"],
            [
                'nama' => ucfirst($role),
                'email' => "uji-{$role}@pos.local",
                'password' => 'password123',
                'role' => $role,
                'status' => 'aktif',
            ]
        );
    }

    public function test_admin_tidak_bisa_menghapus_akun_manager(): void
    {
        $manager = $this->userWithRole('manager');
        Sanctum::actingAs($this->userWithRole('admin'));

        $this->deleteJson("/api/users/{$manager->id_user}")
            ->assertStatus(403);

        $this->assertNull($manager->fresh()->deleted_at);
    }

    public function test_admin_tidak_bisa_menurunkan_pangkat_atau_menonaktifkan_manager(): void
    {
        $manager = $this->userWithRole('manager');
        Sanctum::actingAs($this->userWithRole('admin'));

        $this->putJson("/api/users/{$manager->id_user}", ['role' => 'kasir'])->assertStatus(403);
        $this->putJson("/api/users/{$manager->id_user}", ['status' => 'nonaktif'])->assertStatus(403);
        $this->putJson("/api/users/{$manager->id_user}", ['nama' => 'Manager Baru'])->assertStatus(403);

        $manager->refresh();
        $this->assertSame('manager', $manager->role);
        $this->assertSame('aktif', $manager->status);
    }

    public function test_admin_tidak_bisa_membuat_akun_manager_atau_owner(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        foreach (['manager', 'owner'] as $role) {
            $this->postJson('/api/users', [
                'nama' => 'Akun Baru',
                'username' => "baru-{$role}",
                'email' => "baru-{$role}@pos.local",
                'password' => 'password123',
                'role' => $role,
            ])->assertStatus(403);
        }

        $this->assertDatabaseMissing('users', ['username' => 'baru-manager']);
    }

    public function test_admin_tetap_bisa_mengelola_akun_karyawan_dan_pelanggan(): void
    {
        $kasir = $this->userWithRole('kasir');
        Sanctum::actingAs($this->userWithRole('admin'));

        $this->postJson('/api/users', [
            'nama' => 'Kasir Baru',
            'username' => 'kasir-baru',
            'email' => 'kasir-baru@pos.local',
            'password' => 'password123',
            'role' => 'kasir',
        ])->assertCreated();

        $this->putJson("/api/users/{$kasir->id_user}", ['status' => 'nonaktif'])
            ->assertOk()
            ->assertJsonPath('data.status', 'nonaktif');

        $this->deleteJson("/api/users/{$kasir->id_user}")->assertOk();
    }

    public function test_owner_boleh_mengelola_akun_manager(): void
    {
        $manager = $this->userWithRole('manager');
        Sanctum::actingAs($this->userWithRole('owner'));

        $this->putJson("/api/users/{$manager->id_user}", ['nama' => 'Manager Revisi'])
            ->assertOk()
            ->assertJsonPath('data.nama', 'Manager Revisi');

        $this->deleteJson("/api/users/{$manager->id_user}")->assertOk();
    }

    public function test_daftar_pengguna_menandai_akun_yang_boleh_dikelola_admin(): void
    {
        $this->userWithRole('manager');
        $this->userWithRole('kasir');
        Sanctum::actingAs($this->userWithRole('admin'));

        $items = $this->getJson('/api/users')->assertOk()->json('data.data');

        $perRole = collect($items)->mapWithKeys(fn (array $u) => [
            $u['role'] => $u['boleh_dikelola'],
        ]);

        $this->assertFalse($perRole['manager']);
        $this->assertTrue($perRole['kasir']);
    }

    public function test_admin_tidak_bisa_membuat_akun_manager_dari_data_karyawan(): void
    {
        $karyawan = Karyawan::factory()->create(['status_karyawan' => 'aktif']);
        Sanctum::actingAs($this->userWithRole('admin'));

        $this->postJson("/api/karyawan/{$karyawan->id_karyawan}/akun", [
            'username' => 'karyawan-manager',
            'password' => 'rahasia123',
            'role' => 'manager',
        ])->assertStatus(403);

        $this->postJson("/api/karyawan/{$karyawan->id_karyawan}/akun", [
            'username' => 'karyawan-kasir',
            'password' => 'rahasia123',
            'role' => 'kasir',
        ])->assertCreated();
    }

    public function test_dashboard_kasir_tanpa_data_bisnis_dan_manager_dapat_semua(): void
    {
        Sanctum::actingAs($this->userWithRole('kasir'));

        $kasir = $this->getJson('/api/dashboard/stats')->assertOk()->json('data');

        $this->assertArrayHasKey('penjualan_hari_ini', $kasir);
        $this->assertArrayNotHasKey('laba_kotor_bulan_ini', $kasir);
        $this->assertArrayNotHasKey('total_pelanggan', $kasir);
        $this->assertArrayNotHasKey('pembelian_bulan_ini', $kasir);
        $this->assertSame([], $kasir['barang_terlaris']);
        $this->assertFalse($kasir['akses']['ringkasan_bisnis']);

        Sanctum::actingAs($this->userWithRole('manager'));

        $manager = $this->getJson('/api/dashboard/stats')->assertOk()->json('data');

        $this->assertArrayHasKey('laba_kotor_bulan_ini', $manager);
        $this->assertArrayHasKey('total_pelanggan', $manager);
        $this->assertArrayHasKey('barang_terlaris', $manager);
        $this->assertTrue($manager['akses']['ringkasan_bisnis']);
    }

    public function test_stok_minimum_kasir_tanpa_harga_dan_supplier(): void
    {
        $this->seed(DatabaseSeeder::class);
        $barang = Barang::firstOrFail();
        $barang->update(['stok' => 1, 'stok_minimum' => 10]);

        Sanctum::actingAs($this->userWithRole('kasir'));
        $kasirItems = $this->getJson('/api/barang/stok-minimum')->assertOk()->json('data');

        $this->assertArrayNotHasKey('harga_beli', $kasirItems[0]);
        $this->assertArrayNotHasKey('supplier', $kasirItems[0]);
        $this->assertArrayHasKey('stok', $kasirItems[0]);

        Sanctum::actingAs($this->userWithRole('manager'));
        $managerItems = $this->getJson('/api/barang/stok-minimum')->assertOk()->json('data');

        $this->assertArrayHasKey('harga_beli', $managerItems[0]);
    }
}
