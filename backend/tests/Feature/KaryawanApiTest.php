<?php

namespace Tests\Feature;

use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Modul kepegawaian: CRUD karyawan, akun login, dan matriks otorisasi
 * admin / manager / karyawan.
 */
class KaryawanApiTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        return User::create([
            'nama' => ucfirst($role),
            'username' => "user-{$role}",
            'email' => "{$role}@pos.local",
            'password' => 'password123',
            'role' => $role,
            'status' => 'aktif',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $override = []): array
    {
        return array_merge([
            'nip' => 'KRY-0001',
            'nama_lengkap' => 'Budi Santoso',
            'jenis_kelamin' => 'L',
            'tempat_lahir' => 'Surabaya',
            'tanggal_lahir' => '1995-04-12',
            'alamat' => 'Jl. Raya No. 1',
            'no_telepon' => '081234567890',
            'email' => 'budi@pos.local',
            'jabatan' => 'Kasir',
            'divisi' => 'Operasional',
            'tanggal_masuk' => '2024-01-02',
            'status_karyawan' => 'aktif',
        ], $override);
    }

    public function test_admin_dapat_menambah_dan_melihat_karyawan(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        $response = $this->postJson('/api/karyawan', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.nama_lengkap', 'Budi Santoso')
            ->assertJsonPath('data.status_karyawan', 'aktif');

        $id = $response->json('data.id_karyawan');

        $this->getJson('/api/karyawan')->assertOk()->assertJsonCount(1, 'data.data');
        $this->getJson("/api/karyawan/{$id}")->assertOk()->assertJsonPath('data.nip', 'KRY-0001');
    }

    public function test_nip_dan_nama_lengkap_wajib_valid(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        Karyawan::factory()->create(['nip' => 'KRY-0001']);

        $this->postJson('/api/karyawan', $this->payload(['nama_lengkap' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama_lengkap', 'nip']);

        $this->postJson('/api/karyawan', $this->payload(['jenis_kelamin' => 'X', 'status_karyawan' => 'pensiun']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['jenis_kelamin', 'status_karyawan']);
    }

    public function test_manager_boleh_crud_tetapi_tidak_boleh_mengubah_jabatan_status_dan_akun(): void
    {
        Sanctum::actingAs($this->userWithRole('manager'));

        $id = $this->postJson('/api/karyawan', $this->payload(['jabatan' => 'Kasir']))
            ->assertCreated()
            ->assertJsonPath('data.jabatan', null)
            ->json('data.id_karyawan');

        $this->putJson("/api/karyawan/{$id}", $this->payload([
            'nama_lengkap' => 'Budi Santoso Revisi',
            'jabatan' => 'Manajer',
            'status_karyawan' => 'cuti',
        ]))
            ->assertOk()
            ->assertJsonPath('data.nama_lengkap', 'Budi Santoso Revisi')
            ->assertJsonPath('data.jabatan', null)
            ->assertJsonPath('data.status_karyawan', 'aktif');

        $this->putJson("/api/karyawan/{$id}/status", ['status_karyawan' => 'nonaktif'])->assertStatus(403);
        $this->postJson("/api/karyawan/{$id}/akun", [
            'username' => 'budi',
            'password' => 'rahasia123',
            'role' => 'kasir',
        ])->assertStatus(403);
        $this->deleteJson("/api/karyawan/{$id}")->assertStatus(403);
    }

    public function test_kasir_dan_pelanggan_tidak_boleh_mengakses_modul_kepegawaian(): void
    {
        $karyawan = Karyawan::factory()->create();

        foreach (['kasir', 'pelanggan'] as $role) {
            Sanctum::actingAs($this->userWithRole($role));

            $this->getJson('/api/karyawan')->assertStatus(403);
            $this->postJson('/api/karyawan', $this->payload(['nip' => null, 'email' => null]))->assertStatus(403);
            $this->getJson("/api/karyawan/{$karyawan->id_karyawan}")->assertStatus(403);
        }
    }

    public function test_admin_membuat_akun_login_dan_menonaktifkannya_lewat_status(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        $karyawan = Karyawan::factory()->create([
            'status_karyawan' => 'aktif',
            'email' => 'budi@pos.local',
            'nama_lengkap' => 'Budi Santoso',
        ]);

        $this->postJson("/api/karyawan/{$karyawan->id_karyawan}/akun", [
            'username' => 'budi',
            'password' => 'rahasia123',
            'role' => 'kasir',
        ])
            ->assertCreated()
            ->assertJsonPath('data.user.username', 'budi')
            ->assertJsonPath('data.user.role', 'kasir');

        $user = User::where('username', 'budi')->firstOrFail();
        $this->assertSame('budi@pos.local', $user->email);

        // Akun karyawan bisa login dan menerima profil kepegawaiannya.
        $this->postJson('/api/auth/login', ['identifier' => 'budi', 'password' => 'rahasia123'])
            ->assertOk()
            ->assertJsonPath('data.karyawan.id_karyawan', $karyawan->id_karyawan);

        $this->putJson("/api/karyawan/{$karyawan->id_karyawan}/status", ['status_karyawan' => 'nonaktif'])
            ->assertOk();

        $this->assertSame('nonaktif', $user->fresh()->status);
        $this->postJson('/api/auth/login', ['identifier' => 'budi', 'password' => 'rahasia123'])
            ->assertStatus(422);

        // Sinkron balik ketika karyawan aktif lagi.
        $this->putJson("/api/karyawan/{$karyawan->id_karyawan}/status", ['status_karyawan' => 'aktif'])->assertOk();
        $this->assertSame('aktif', $user->fresh()->status);
    }

    public function test_akun_tidak_bisa_dibuat_ganda_atau_untuk_karyawan_nonaktif(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        $kasir = $this->userWithRole('kasir');
        $karyawan = Karyawan::factory()->untukUser($kasir)->create();

        $this->postJson("/api/karyawan/{$karyawan->id_karyawan}/akun", [
            'username' => 'kasir-baru',
            'password' => 'rahasia123',
            'role' => 'kasir',
        ])->assertStatus(422)->assertJsonValidationErrors(['id_user']);

        $nonaktif = Karyawan::factory()->nonaktif()->create();

        $this->postJson("/api/karyawan/{$nonaktif->id_karyawan}/akun", [
            'username' => 'nonaktif',
            'password' => 'rahasia123',
            'role' => 'kasir',
        ])->assertStatus(422)->assertJsonValidationErrors(['status_karyawan']);
    }

    public function test_profil_menyertakan_data_kepegawaian_dan_akses(): void
    {
        $user = $this->userWithRole('manager');
        $karyawan = Karyawan::factory()->create();
        $karyawan->update(['id_user' => $user->id_user]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/profile')->assertOk();

        $this->assertSame($karyawan->id_karyawan, $response->json('data.karyawan.id_karyawan'));
        $this->assertTrue($response->json('data.akses.karyawan'));
        $this->assertFalse($response->json('data.akses.karyawan_akun'));

        $this->getJson('/api/karyawan/me')->assertOk()->assertJsonPath('data.id_karyawan', $karyawan->id_karyawan);
    }

    public function test_upload_dan_hapus_foto_karyawan(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->userWithRole('admin'));

        $response = $this->postJson('/api/karyawan', $this->payload([
            'foto' => UploadedFile::fake()->image('budi.jpg'),
        ]))->assertCreated();

        $foto = $response->json('data.foto');
        $id = $response->json('data.id_karyawan');

        $this->assertStringStartsWith('/storage/karyawan/', $foto);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $foto));

        $this->putJson("/api/karyawan/{$id}", $this->payload(['hapus_foto' => true]))
            ->assertOk()
            ->assertJsonPath('data.foto', null);

        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $foto));

        $this->deleteJson("/api/karyawan/{$id}")->assertOk();
        $this->assertDatabaseMissing('karyawan', ['id_karyawan' => $id]);
    }
}
