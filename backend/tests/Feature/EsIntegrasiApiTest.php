<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Kategori;
use App\Models\User;
use App\Services\EsInferenceService;
use Database\Seeders\DssKriteriaSeeder;
use Database\Seeders\EsBasisPengetahuanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Integrasi Expert System dengan TPS/OAS/KMS/MIS/DSS (dua arah).
 */
class EsIntegrasiApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([DssKriteriaSeeder::class, EsBasisPengetahuanSeeder::class]);
    }

    protected function adminUser(): User
    {
        return User::firstOrCreate(
            ['username' => 'admin'],
            [
                'nama' => 'Administrator',
                'email' => 'admin@pos.local',
                'password' => 'password123',
                'role' => 'admin',
                'status' => 'aktif',
            ]
        );
    }

    /**
     * Modul MIS/DSS/ES hanya dapat diakses role manager.
     */
    protected function managerUser(): User
    {
        return User::firstOrCreate(
            ['username' => 'manager'],
            [
                'nama' => 'Manager',
                'email' => 'manager@pos.local',
                'password' => 'password123',
                'role' => 'manager',
                'status' => 'aktif',
            ]
        );
    }

    /**
     * Data TPS/OAS minimal: satu SKU kritis yang laris, satu SKU menumpuk
     * tanpa penjualan, satu transaksi selesai, dan log tanpa referensi.
     *
     * @return array{kritis: Barang, tidur: Barang}
     */
    protected function seedDataOperasional(): array
    {
        $kategori = Kategori::create(['nama_kategori' => 'Uji']);
        $admin = $this->adminUser();

        $kritis = Barang::create([
            'kode_barang' => 'BRG-T01',
            'id_kategori' => $kategori->id_kategori,
            'nama_barang' => 'Kopi Arabika Uji',
            'harga_beli' => 20000,
            'harga_jual' => 30000,
            'stok' => 1,
            'stok_minimum' => 10,
            'satuan' => 'pack',
        ]);

        $tidur = Barang::create([
            'kode_barang' => 'BRG-T02',
            'id_kategori' => $kategori->id_kategori,
            'nama_barang' => 'Tumbler Uji',
            'harga_beli' => 50000,
            'harga_jual' => 75000,
            'stok' => 80,
            'stok_minimum' => 5,
            'satuan' => 'pcs',
        ]);

        // Barang lama agar SKU tidak berputar > 30 hari terdeteksi.
        $tidur->forceFill(['created_at' => now()->subDays(200)])->saveQuietly();

        $idTransaksi = DB::table('transaksi')->insertGetId([
            'no_transaksi' => 'TRX-UJI-01',
            'id_kasir' => $admin->id_user,
            'tanggal' => now()->subDay()->toDateTimeString(),
            'total_harga' => 30000,
            'metode_bayar' => 'cash',
            'status' => 'selesai',
        ]);

        DB::table('detail_transaksi')->insert([
            'id_transaksi' => $idTransaksi,
            'id_barang' => $kritis->id_barang,
            'jumlah' => 20,
            'harga_satuan' => 30000,
            'harga_setelah_diskon' => 30000,
            'subtotal' => 600000,
        ]);

        DB::table('stok_log')->insert([
            'id_barang' => $kritis->id_barang,
            'jenis' => 'penyesuaian',
            'jumlah' => -2,
            'stok_sebelum' => 3,
            'stok_sesudah' => 1,
            'referensi' => null,
            'keterangan' => null,
            'id_user' => $admin->id_user,
            'created_at' => now()->subDays(5),
        ]);

        return ['kritis' => $kritis, 'tidur' => $tidur];
    }

    public function test_dashboard_es_menampilkan_status_sumber_data(): void
    {
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/es/dashboard');

        $response->assertOk()
            ->assertJsonPath('data.sumber_data.0.modul', 'TPS')
            ->assertJsonStructure([
                'data' => [
                    'sumber_data' => [['modul', 'nama', 'status', 'tabel', 'jumlah_record', 'dipakai_untuk']],
                    'deteksi_otomatis' => [
                        'periode' => ['kode', 'label'],
                        'daftar_periode',
                        'ringkasan',
                        'gejala',
                    ],
                ],
            ]);

        $modul = collect($response->json('data.sumber_data'))->pluck('modul')->all();
        $this->assertSame(['TPS', 'OAS', 'KMS', 'MIS', 'DSS'], $modul);
    }

    public function test_gejala_dinilai_otomatis_dari_data_operasional(): void
    {
        $data = $this->seedDataOperasional();
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/es/dashboard?periode=90_hari');
        $gejala = collect($response->json('data.deteksi_otomatis.gejala'))->keyBy('kode_gejala');

        // Stok di bawah minimum → G05.
        $this->assertTrue($gejala->has('G05'));
        $this->assertSame(
            $data['kritis']->kode_barang,
            $gejala['G05']['bukti']['detail'][0]['kode']
        );

        // SKU tanpa penjualan > 30 hari → G06 dan modal terikat → G07.
        $this->assertTrue($gejala->has('G06'));
        $this->assertTrue($gejala->has('G07'));

        // Log tanpa referensi → G19.
        $this->assertTrue($gejala->has('G19'));
    }

    public function test_diagnosa_otomatis_memakai_bukti_tanpa_input_manual(): void
    {
        $this->seedDataOperasional();
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/es/diagnose', [
            'gejala' => [],
            'periode' => '90_hari',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.otomatis_aktif', true)
            ->assertJsonPath('data.hasil', 'teridentifikasi');

        $this->assertNotEmpty($response->json('data.gejala_otomatis'));
        $this->assertSame(
            EsInferenceService::ASAL_OTOMATIS,
            $response->json('data.gejala_terpilih.0.asal')
        );

        // Yang tersimpan adalah kandidat yang sudah diperkaya data pendukung.
        $kandidat = $response->json('data.kandidat.0');
        $this->assertArrayHasKey('data_pendukung', $kandidat);
        $this->assertGreaterThan(0, collect($kandidat['data_pendukung'])->sum('bukti.jumlah'));
        $this->assertArrayHasKey('rujukan_knowledge', $kandidat);
    }

    public function test_input_manual_menjadi_koreksi_bukti_otomatis(): void
    {
        $this->seedDataOperasional();
        Sanctum::actingAs($this->managerUser());

        $otomatis = $this->postJson('/api/es/simulate', ['gejala' => ['G05']])->json('data');
        $cfOtomatis = collect($otomatis['gejala_otomatis'])
            ->firstWhere('kode_gejala', 'G05')['cf_otomatis'];

        $koreksi = $this->postJson('/api/es/simulate', [
            'gejala' => ['G05' => 0.5],
        ])->json('data');

        $this->assertNotNull($cfOtomatis);
        $this->assertGreaterThan(0.5, $cfOtomatis, 'Bukti otomatis harus lebih kuat dari koreksi.');

        $gejala = collect($koreksi['gejala_terpilih'])->firstWhere('kode_gejala', 'G05');
        $this->assertSame(0.5, $gejala['cf_pengguna']);
        $this->assertSame(EsInferenceService::ASAL_MANUAL, $gejala['asal']);
        $this->assertTrue(
            collect($koreksi['gejala_otomatis'])->firstWhere('kode_gejala', 'G05')['dikoreksi']
        );
    }

    public function test_mode_manual_mengabaikan_bukti_otomatis(): void
    {
        $this->seedDataOperasional();
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/es/simulate', [
            'gejala' => ['G15', 'G16'],
            'otomatis' => false,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.otomatis_aktif', false)
            ->assertJsonPath('data.utama.kode_kerusakan', 'K07');

        $this->assertSame([], $response->json('data.gejala_otomatis'));
        $this->assertCount(2, $response->json('data.gejala_terpilih'));
    }

    public function test_dss_memakai_diagnosa_es_terakhir_sebagai_konteks(): void
    {
        $data = $this->seedDataOperasional();
        Sanctum::actingAs($this->managerUser());

        $this->getJson('/api/dss/dashboard')
            ->assertOk()
            ->assertJsonPath('data.konteks_es.tersedia', false);

        // Diagnosa K02 yang menyebut SKU kritis secara otomatis.
        $this->postJson('/api/es/diagnose', ['gejala' => ['G05', 'G04'], 'periode' => '90_hari'])
            ->assertCreated()
            ->assertJsonPath('data.utama.kode_kerusakan', 'K02');

        $dashboard = $this->getJson('/api/dss/dashboard')->assertOk();

        $dashboard->assertJsonPath('data.konteks_es.kode_kerusakan', 'K02')
            ->assertJsonPath('data.konteks_es.tersedia', true);

        $this->assertContains($data['kritis']->kode_barang, $dashboard->json('data.konteks_es.barang_terdampak'));

        // SSK kritis diperkuat oleh diagnosa ES pada nilai urgensi (C1).
        $baris = collect($dashboard->json('data.peringkat'))->firstWhere('kode_barang', $data['kritis']->kode_barang);
        $this->assertNotNull($baris);
        $this->assertTrue($baris['es_menandai']);
        $this->assertStringContainsString('diagnosis ES K02', $baris['dasar_nilai']['C1']);
    }

    public function test_dss_tetap_jalan_tanpa_riwayat_es(): void
    {
        $this->seedDataOperasional();
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/dss/dashboard')->assertOk();

        $this->assertFalse($response->json('data.konteks_es.tersedia'));
        $this->assertNotEmpty($response->json('data.peringkat'));
    }
}
