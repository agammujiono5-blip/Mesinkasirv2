<?php

namespace Tests\Feature;

use App\Models\EsDiagnosa;
use App\Models\EsKerusakan;
use App\Models\User;
use App\Services\EsInferenceService;
use Database\Seeders\EsBasisPengetahuanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(EsBasisPengetahuanSeeder::class);
    }

    protected function managerUser(): User
    {
        return User::create([
            'nama' => 'Manager',
            'username' => 'manager',
            'email' => 'manager@pos.local',
            'password' => 'password123',
            'role' => 'manager',
            'status' => 'aktif',
        ]);
    }

    protected function kasirUser(): User
    {
        return User::create([
            'nama' => 'Kasir',
            'username' => 'kasir1',
            'email' => 'kasir@pos.local',
            'password' => 'password123',
            'role' => 'kasir',
            'status' => 'aktif',
        ]);
    }

    public function test_endpoint_es_butuh_autentikasi(): void
    {
        $this->getJson('/api/es/dashboard')->assertStatus(401);
        $this->getJson('/api/es/gejala')->assertStatus(401);
        $this->postJson('/api/es/diagnose', [])->assertStatus(401);
    }

    public function test_dashboard_menampilkan_ringkasan_basis_pengetahuan(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->getJson('/api/es/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.basis_pengetahuan.siap', true)
            ->assertJsonPath('data.basis_pengetahuan.total_kerusakan', 10)
            ->assertJsonPath('data.basis_pengetahuan.total_gejala', 20)
            ->assertJsonPath('data.ambang_keyakinan_persen', 35)
            ->assertJsonStructure([
                'data' => [
                    'metode',
                    'basis_pengetahuan' => ['total_rule', 'per_kategori', 'total_diagnosa'],
                    'kategori',
                    'riwayat',
                ],
            ]);
    }

    public function test_gejala_dan_kerusakan_mengembalikan_basis_pengetahuan(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->getJson('/api/es/gejala')
            ->assertOk()
            ->assertJsonCount(20, 'data.gejala')
            ->assertJsonPath('data.gejala.0.kode_gejala', 'G01');

        $this->getJson('/api/es/kerusakan?kategori=stok')
            ->assertOk()
            ->assertJsonPath('data.kerusakan.0.kode_kerusakan', 'K01')
            ->assertJsonStructure([
                'data' => [
                    'kerusakan' => [[
                        'kode_kerusakan',
                        'nama_kerusakan',
                        'kategori_label',
                        'solusi',
                        'jumlah_rule',
                        'rule' => [['kode_rule', 'kode_gejala', 'cf_pakar']],
                    ]],
                ],
            ]);
    }

    public function test_basis_aturan_menampilkan_pernyataan_if_then(): void
    {
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/es/aturan')->assertOk();

        $this->assertGreaterThan(0, $response->json('data.total'));
        $this->assertStringContainsString('IF G01', $response->json('data.rule.0.pernyataan'));
        $this->assertStringContainsString('THEN K01', $response->json('data.rule.0.pernyataan'));
    }

    public function test_diagnose_menyimpan_riwayat_dan_mengurutkan_kandidat(): void
    {
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/es/diagnose', [
            'gejala' => ['G01', 'G02'],
            'catatan' => 'Uji diagnosa opname',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.hasil', 'teridentifikasi')
            ->assertJsonPath('data.utama.kode_kerusakan', 'K01')
            ->assertJsonPath('data.disimpan', true);

        $this->assertSame('K01', $response->json('data.kandidat.0.kode_kerusakan'));
        $this->assertGreaterThanOrEqual(0.85, $response->json('data.utama.cf'));

        $this->assertDatabaseHas('es_diagnosa', ['kode_kerusakan' => 'K01', 'catatan' => 'Uji diagnosa opname']);
        $this->assertSame(1, EsDiagnosa::count());
    }

    public function test_diagnose_gejala_tunggal_memberi_keyakinan_yang_sesuai_cf(): void
    {
        Sanctum::actingAs($this->managerUser());

        // G04 hanya terhubung ke K02 dengan CF pakar 0.80 → CF akhir 0.80.
        $response = $this->postJson('/api/es/diagnose', ['gejala' => ['G04']]);

        $response->assertCreated()
            ->assertJsonPath('data.hasil', 'teridentifikasi')
            ->assertJsonPath('data.utama.kode_kerusakan', 'K02')
            ->assertJsonPath('data.utama.tingkat_keyakinan', 'yakin');

        $this->assertCount(1, $response->json('data.kandidat'));
    }

    public function test_diagnose_menolak_input_kosong(): void
    {
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/es/diagnose', ['gejala' => []]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['errors' => ['gejala']]);

        $this->assertDatabaseCount('es_diagnosa', 0);
    }

    public function test_diagnose_menolak_kode_gejala_tidak_dikenal(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->postJson('/api/es/diagnose', ['gejala' => ['G99']])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['gejala']]);
    }

    public function test_simulate_tidak_menyimpan_riwayat(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->postJson('/api/es/simulate', ['gejala' => ['G15', 'G16']])
            ->assertOk()
            ->assertJsonPath('data.disimpan', false)
            ->assertJsonPath('data.utama.kode_kerusakan', 'K07');

        $this->assertDatabaseCount('es_diagnosa', 0);
    }

    public function test_riwayat_dan_detail_diagnosa(): void
    {
        Sanctum::actingAs($this->managerUser());

        $id = $this->postJson('/api/es/diagnose', ['gejala' => ['G06', 'G07']])->json('data.id_diagnosa');

        $this->getJson('/api/es/history')
            ->assertOk()
            ->assertJsonPath('data.0.kode_kerusakan', 'K03');

        $this->assertCount(1, $this->getJson('/api/es/history')->json('data'));

        $this->getJson("/api/es/history/{$id}")
            ->assertOk()
            ->assertJsonPath('data.kode_kerusakan', 'K03')
            ->assertJsonStructure(['data' => ['solusi', 'langkah_inferensi', 'kandidat', 'gejala_terpilih']]);

        $this->getJson('/api/es/history/999')->assertStatus(404);
    }

    public function test_kasir_tidak_boleh_menyimpan_diagnosa_tetapi_boleh_melihat(): void
    {
        Sanctum::actingAs($this->kasirUser());

        $this->getJson('/api/es/dashboard')->assertOk();
        $this->postJson('/api/es/diagnose', ['gejala' => ['G01']])->assertStatus(403);
    }

    public function test_pelanggan_tidak_dapat_membuka_modul_es(): void
    {
        $pelanggan = User::create([
            'nama' => 'Pelanggan',
            'username' => 'pelanggan1',
            'email' => 'pelanggan@pos.local',
            'password' => 'password123',
            'role' => 'pelanggan',
            'status' => 'aktif',
        ]);
        Sanctum::actingAs($pelanggan);

        $this->getJson('/api/es/dashboard')->assertStatus(403);
        $this->getJson('/api/es/gejala')->assertStatus(403);
        $this->postJson('/api/es/diagnose', ['gejala' => ['G01']])->assertStatus(403);
    }

    public function test_kasir_dapat_menggunakan_simulasi_diagnosa_tanpa_menyimpan(): void
    {
        Sanctum::actingAs($this->kasirUser());

        $this->postJson('/api/es/simulate', ['gejala' => ['G01']])
            ->assertOk()
            ->assertJsonPath('data.disimpan', false);

        $this->assertDatabaseCount('es_diagnosa', 0);
    }

    public function test_inferensi_menggabungkan_cf_secara_komulatif(): void
    {
        $service = new EsInferenceService;

        $hasil = $service->inferensi([
            ['kode_rule' => 'K01-01', 'kode_kerusakan' => 'K01', 'kode_gejala' => 'G01', 'cf_pakar' => 0.90],
            ['kode_rule' => 'K01-02', 'kode_kerusakan' => 'K01', 'kode_gejala' => 'G02', 'cf_pakar' => 0.50],
            ['kode_rule' => 'K02-01', 'kode_kerusakan' => 'K02', 'kode_gejala' => 'G05', 'cf_pakar' => 0.90],
        ], ['G01' => 0.8, 'G02' => 1.0]);

        // CF1 = 0.9 x 0.8 = 0.72 ; CF2 = 0.5 x 1 = 0.5 ; gabungan = 0.72 + 0.5 x (1 - 0.72) = 0.86
        $this->assertEqualsWithDelta(0.86, $hasil['kandidat'][0]['cf'], 0.0001);
        $this->assertSame('K01', $hasil['kandidat'][0]['kode_kerusakan']);
        $this->assertSame('sangat yakin', $hasil['kandidat'][0]['tingkat_keyakinan']);
        $this->assertSame(2, $hasil['total_rule_terpicu']);
    }

    public function test_inferensi_menghormati_cf_pengguna_nol(): void
    {
        $service = new EsInferenceService;

        $hasil = $service->inferensi([
            ['kode_rule' => 'K01-01', 'kode_kerusakan' => 'K01', 'kode_gejala' => 'G01', 'cf_pakar' => 0.90],
        ], ['G01' => 0.0]);

        $this->assertSame([], $hasil['kandidat']);
        $this->assertNull($hasil['utama']);
    }

    public function test_tidak_ada_rule_terpicu_menghasilkan_kandidat_kosong(): void
    {
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/es/diagnose', ['gejala' => ['G20']]);

        $response->assertCreated()
            ->assertJsonPath('data.hasil', 'tidak_teridentifikasi')
            ->assertJsonPath('data.kandidat', []);
    }

    public function test_kategori_tanpa_hipotesis_mengembalikan_daftar_kosong(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->getJson('/api/es/kerusakan?kategori=tidak_ada')
            ->assertOk()
            ->assertJsonPath('data.total', 0);

        $this->assertSame(10, EsKerusakan::count());
    }
}
