<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Autentikasi & otorisasi lintas modul (MIS, DSS, ES).
 */
class AuthzApiTest extends TestCase
{
    use RefreshDatabase;

    protected function userWithRole(string $role): User
    {
        // Email tidak boleh menabrak akun lain (mis. akun hasil seeder yang
        // kini mencakup admin, manager, dan kasir1 dengan domain yang sama).
        return User::firstOrCreate(
            ['username' => "user-{$role}"],
            [
                'nama' => ucfirst($role),
                'email' => "user-{$role}@uji.local",
                'password' => 'password123',
                'role' => $role,
                'status' => 'aktif',
            ]
        );
    }

    public function test_registrasi_publik_selalu_membuat_role_pelanggan(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'nama' => 'Penyusup',
            'username' => 'penyusup',
            'email' => 'penyusup@pos.local',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'role' => 'admin',
        ]);

        $response->assertCreated()->assertJsonPath('data.user.role', 'pelanggan');

        $this->assertDatabaseHas('users', ['username' => 'penyusup', 'role' => 'pelanggan']);
    }

    public function test_login_menolak_password_salah(): void
    {
        User::create([
            'nama' => 'Admin',
            'username' => 'admin',
            'email' => 'admin@pos.local',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'aktif',
        ]);

        // Password "admin123" pernah lolos lewat pintasan lama di AuthService.
        $this->postJson('/api/auth/login', ['identifier' => 'admin', 'password' => 'admin123'])
            ->assertStatus(422);

        $this->postJson('/api/auth/login', ['identifier' => 'admin', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user', 'akses', 'permissions']]);
    }

    public function test_login_menolak_akun_nonaktif(): void
    {
        User::create([
            'nama' => 'Kasir Nonaktif',
            'username' => 'kasir-off',
            'email' => 'kasir-off@pos.local',
            'password' => 'password123',
            'role' => 'kasir',
            'status' => 'nonaktif',
        ]);

        $this->postJson('/api/auth/login', ['identifier' => 'kasir-off', 'password' => 'password123'])
            ->assertStatus(422);
    }

    public function test_token_akun_yang_dinonaktifkan_langsung_ditolak(): void
    {
        $manager = $this->userWithRole('manager');
        Sanctum::actingAs($manager);

        $this->getJson('/api/es/dashboard')->assertOk();

        $manager->update(['status' => 'nonaktif']);

        $this->getJson('/api/es/dashboard')->assertStatus(403);
    }

    public function test_profil_mengirim_hak_akses_modul_sesuai_role(): void
    {
        Sanctum::actingAs($this->userWithRole('kasir'));

        $response = $this->getJson('/api/auth/profile')->assertOk();

        $this->assertFalse($response->json('data.akses.es'));
        $this->assertFalse($response->json('data.akses.es_diagnose'));
        $this->assertFalse($response->json('data.akses.mis'));
        $this->assertFalse($response->json('data.akses.dss'));
    }

    public function test_hak_akses_modul_per_role_sesuai_matriks(): void
    {
        $ekspektasi = [
            'admin' => ['mis' => false, 'dss' => false, 'dss_criteria' => false, 'es' => false, 'es_diagnose' => false],
            'owner' => ['mis' => false, 'dss' => false, 'dss_criteria' => false, 'es' => false, 'es_diagnose' => false],
            'manager' => ['mis' => true, 'dss' => true, 'dss_criteria' => true, 'es' => true, 'es_diagnose' => true],
            'kasir' => ['mis' => false, 'dss' => false, 'dss_criteria' => false, 'es' => false, 'es_diagnose' => false],
            'pelanggan' => ['mis' => false, 'dss' => false, 'dss_criteria' => false, 'es' => false, 'es_diagnose' => false],
        ];

        foreach ($ekspektasi as $role => $harapan) {
            Sanctum::actingAs($this->userWithRole($role));

            $akses = $this->getJson('/api/auth/profile')->json('data.akses');

            foreach ($harapan as $kunci => $nilai) {
                $this->assertSame($nilai, $akses[$kunci], "Akses {$kunci} untuk role {$role} tidak sesuai.");
            }
        }
    }

    public function test_modul_mis_dss_es_hanya_untuk_manager(): void
    {
        $this->getJson('/api/dashboard/executive')->assertStatus(401);

        $this->actingAs($this->userWithRole('manager'));
        $this->getJson('/api/dashboard/executive')->assertOk();
        $this->getJson('/api/dss/dashboard')->assertOk();
        $this->getJson('/api/es/dashboard')->assertOk();

        foreach (['admin', 'owner', 'kasir', 'pelanggan'] as $role) {
            $this->actingAs($this->userWithRole($role));

            $this->getJson('/api/dashboard/executive')->assertStatus(403);
            $this->putJson('/api/dashboard/rekomendasi/1', ['status' => 'Disetujui'])->assertStatus(403);
            $this->getJson('/api/dss/dashboard')->assertStatus(403);
            $this->getJson('/api/es/dashboard')->assertStatus(403);
        }
    }

    public function test_kasir_tetap_dapat_dashboard_operasional(): void
    {
        Sanctum::actingAs($this->userWithRole('kasir'));

        $this->getJson('/api/dashboard/stats')->assertOk();
        $this->getJson('/api/dashboard/chart')->assertOk();
    }

    public function test_middleware_permission_menolak_role_tanpa_permission(): void
    {
        $this->seed(DatabaseSeeder::class);

        $manager = $this->userWithRole('manager');
        $this->assertTrue($manager->hasRole('manager'));

        $managerCodes = $manager->permissionCodes();
        $this->assertContains('view_mis', $managerCodes);
        $this->assertContains('analyze_dss', $managerCodes);
        $this->assertContains('manage_dss_kriteria', $managerCodes);
        $this->assertNotContains('manage_users', $managerCodes);

        $kasir = User::where('username', 'kasir1')->first();
        $this->assertEqualsCanonicalizing(
            ['create_transaksi', 'view_transaksi', 'view_dashboard'],
            $kasir->permissionCodes()
        );
    }

    public function test_seeder_tidak_memberi_modul_mis_dss_es_ke_selain_manager(): void
    {
        $this->seed(DatabaseSeeder::class);

        $modulManagerSaja = ['view_mis', 'manage_rekomendasi', 'view_dss', 'analyze_dss', 'manage_dss_kriteria', 'view_es', 'diagnose_es'];
        $idModul = Permission::whereIn('kode_permission', $modulManagerSaja)->pluck('id_permission');

        $this->assertCount(count($modulManagerSaja), $idModul);

        foreach (['admin', 'owner', 'kasir'] as $role) {
            $this->assertSame(
                0,
                RolePermission::where('role', $role)->whereIn('id_permission', $idModul)->count(),
                "Role {$role} seharusnya tidak memiliki permission MIS/DSS/ES."
            );
        }

        $this->assertSame(count($modulManagerSaja), RolePermission::where('role', 'manager')->whereIn('id_permission', $idModul)->count());
    }

    public function test_seeder_memberi_admin_dan_owner_seluruh_permission(): void
    {
        $this->seed(DatabaseSeeder::class);

        $total = Permission::count();
        $dikecualikan = Permission::whereIn('kode_permission', [
            'view_mis', 'manage_rekomendasi', 'view_dss', 'analyze_dss',
            'manage_dss_kriteria', 'view_es', 'diagnose_es',
        ])->count();
        $owner = $this->userWithRole('owner');

        $this->assertGreaterThan(0, $total);
        $this->assertSame($total - $dikecualikan, RolePermission::where('role', 'admin')->count());
        $this->assertSame($total - $dikecualikan, RolePermission::where('role', 'owner')->count());
        $this->assertSame($total - $dikecualikan, count($owner->permissionCodes()));
    }

    public function test_sync_permission_hanya_untuk_admin_dan_owner(): void
    {
        $this->seed(DatabaseSeeder::class);
        $id = Permission::first()->id_permission;

        $manager = $this->userWithRole('manager');
        Sanctum::actingAs($manager);

        $this->postJson('/api/permissions/sync', [
            'role' => 'kasir',
            'permission_ids' => [$id],
        ])->assertStatus(403);
    }

    public function test_admin_dapat_menyinkronkan_permission_role(): void
    {
        $this->seed(DatabaseSeeder::class);
        $id = Permission::first()->id_permission;
        $this->userWithRole('manager');

        Sanctum::actingAs(User::where('username', 'admin')->first());

        $this->postJson('/api/permissions/sync', [
            'role' => 'manager',
            'permission_ids' => [$id],
        ])->assertOk();

        $this->assertDatabaseHas('role_permissions', [
            'role' => 'manager',
            'id_permission' => $id,
        ]);
    }

    public function test_endpoint_permission_menolak_role_tidak_dikenal(): void
    {
        $this->actingAs($this->userWithRole('admin'));

        $this->getJson('/api/permissions/role/superadmin')->assertStatus(404);
        $this->getJson('/api/permissions/role/kasir')->assertOk();
    }

    public function test_logout_mencabut_token(): void
    {
        $user = $this->userWithRole('admin');
        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }
}
