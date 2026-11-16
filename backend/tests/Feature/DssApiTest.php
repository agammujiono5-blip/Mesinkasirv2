<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\Kategori;
use App\Models\Transaksi;
use App\Models\User;
use Database\Seeders\DssKriteriaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DssApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DssKriteriaSeeder::class);
    }

    protected function adminUser(): User
    {
        return User::create([
            'nama' => 'Administrator',
            'username' => 'admin',
            'email' => 'admin@pos.local',
            'password' => 'password123',
            'role' => 'admin',
            'status' => 'aktif',
        ]);
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
        return User::firstOrCreate(
            ['username' => 'kasir1'],
            [
                'nama' => 'Kasir',
                'email' => 'kasir@pos.local',
                'password' => 'password123',
                'role' => 'kasir',
                'status' => 'aktif',
            ]
        );
    }

    /**
     * Buat data TPS minimal: 2 barang + 1 transaksi selesai.
     *
     * @return array{0: Barang, 1: Barang}
     */
    protected function seedTpsData(): array
    {
        $kategori = Kategori::create(['nama_kategori' => 'Elektronik']);

        $barangA = Barang::create([
            'kode_barang' => 'BRG-T01',
            'id_kategori' => $kategori->id_kategori,
            'nama_barang' => 'Barang Uji A',
            'harga_beli' => 100000,
            'harga_jual' => 150000,
            'stok' => 2,
            'stok_minimum' => 5,
            'satuan' => 'unit',
        ]);

        $barangB = Barang::create([
            'kode_barang' => 'BRG-T02',
            'id_kategori' => $kategori->id_kategori,
            'nama_barang' => 'Barang Uji B',
            'harga_beli' => 50000,
            'harga_jual' => 75000,
            'stok' => 40,
            'stok_minimum' => 5,
            'satuan' => 'pcs',
        ]);

        $kasir = $this->kasirUser();

        $transaksi = Transaksi::create([
            'no_transaksi' => 'TRX-TEST-0001',
            'id_kasir' => $kasir->id_user,
            'tanggal' => now()->subDay(),
            'total_harga' => 450000,
            'metode_bayar' => 'cash',
            'status' => 'selesai',
        ]);

        DetailTransaksi::create([
            'id_transaksi' => $transaksi->id_transaksi,
            'id_barang' => $barangA->id_barang,
            'jumlah' => 2,
            'harga_satuan' => 150000,
            'harga_setelah_diskon' => 150000,
            'subtotal' => 300000,
        ]);

        DetailTransaksi::create([
            'id_transaksi' => $transaksi->id_transaksi,
            'id_barang' => $barangB->id_barang,
            'jumlah' => 2,
            'harga_satuan' => 75000,
            'harga_setelah_diskon' => 75000,
            'subtotal' => 150000,
        ]);

        return [$barangA, $barangB];
    }

    public function test_endpoint_dss_butuh_autentikasi(): void
    {
        $this->getJson('/api/dss/dashboard')->assertStatus(401);
        $this->getJson('/api/dss/criteria')->assertStatus(401);
        $this->postJson('/api/dss/analyze', [])->assertStatus(401);
    }

    public function test_dashboard_menampilkan_status_sumber_data(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/dss/dashboard');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'metode',
                    'periode',
                    'kriteria',
                    'sumber_data',
                    'status_integrasi',
                    'ringkasan',
                    'peringkat',
                    'rekomendasi_utama',
                    'riwayat',
                ],
            ]);

        $modul = collect($response->json('data.sumber_data'))->pluck('modul')->all();
        $this->assertSame(['TPS', 'OAS', 'KMS', 'MIS'], $modul);

        $this->assertSame(4, $response->json('data.ringkasan.total_kriteria'));
        $this->assertGreaterThan(0, $response->json('data.ringkasan.total_alternatif'));
    }

    public function test_data_sources_mengembalikan_empat_modul(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/dss/data-sources');

        $response->assertOk()
            ->assertJsonCount(4, 'data.sumber_data')
            ->assertJsonStructure([
                'data' => [
                    'sumber_data' => [['modul', 'status', 'tabel', 'jumlah_record', 'keterangan']],
                    'status_integrasi' => ['total_modul', 'terhubung', 'persentase', 'semua_terhubung'],
                ],
            ]);
    }

    public function test_alternatif_dihitung_dari_data_tps(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $response = $this->getJson('/api/dss/alternatives');

        $response->assertOk();

        $alternatif = collect($response->json('data.alternatif'));
        $this->assertGreaterThanOrEqual(2, $alternatif->count());

        $barangA = $alternatif->firstWhere('nama_alternatif', 'Barang Uji A');
        $this->assertNotNull($barangA);
        $this->assertArrayHasKey('C1', $barangA['nilai']);
        $this->assertArrayHasKey('C3', $barangA['nilai']);
        $this->assertSame(2.0, (float) $barangA['nilai']['C2']);
    }

    public function test_criteria_menampilkan_bobot_dan_total(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->getJson('/api/dss/criteria')
            ->assertOk()
            ->assertJsonPath('data.metode', 'SAW')
            ->assertJsonPath('data.total_bobot', 100)
            ->assertJsonCount(4, 'data.kriteria');
    }

    public function test_analyze_menyimpan_riwayat_dan_peringkat(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/dss/analyze', [
            'periode' => 'all_time',
            'judul' => 'Uji Analisis SAW',
            'bobot' => ['C1' => 35, 'C2' => 25, 'C3' => 20, 'C4' => 20],
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.judul', 'Uji Analisis SAW');

        $hasil = $response->json('data.hasil');
        $this->assertNotEmpty($hasil);
        $this->assertSame(1, $hasil[0]['peringkat']);

        // Skor harus menurun sesuai peringkat.
        for ($i = 1; $i < count($hasil); $i++) {
            $this->assertLessThanOrEqual($hasil[$i - 1]['skor'], $hasil[$i]['skor']);
        }

        $this->assertDatabaseHas('dss_analisis', ['judul' => 'Uji Analisis SAW', 'metode' => 'SAW']);
        $this->assertDatabaseCount('dss_hasil_alternatif', count($hasil));

        // Riwayat menyimpan bobot, kriteria, skor, peringkat, dan waktu analisis.
        $id = $response->json('data.id_analisis');
        $detail = $this->getJson("/api/dss/history/{$id}");

        $detail->assertOk()
            ->assertJsonPath('data.bobot.C1', 35)
            ->assertJsonPath('data.bobot.C2', 25)
            ->assertJsonPath('data.bobot.C3', 20)
            ->assertJsonPath('data.bobot.C4', 20)
            ->assertJsonCount(4, 'data.kriteria');

        $this->assertNotNull($detail->json('data.dibuat_pada'));
        $this->assertNotNull($detail->json('data.hasil.0.skor'));
        $this->assertNotNull($detail->json('data.hasil.0.peringkat'));
    }

    public function test_analyze_menolak_bobot_tidak_seratus(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/dss/analyze', [
            'bobot' => ['C1' => 50, 'C2' => 30, 'C3' => 20, 'C4' => 20],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['errors' => ['bobot']]);

        $this->assertDatabaseCount('dss_analisis', 0);
    }

    public function test_analyze_menolak_bobot_negatif(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $this->postJson('/api/dss/analyze', [
            'bobot' => ['C1' => -35, 'C2' => 55, 'C3' => 40, 'C4' => 40],
        ])->assertStatus(422);
    }

    public function test_analyze_menolak_periode_tanpa_data(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        // Tidak ada transaksi pada hari ini, dan semua stok > minimum.
        DB::table('barang')->update(['stok' => 100]);

        $response = $this->postJson('/api/dss/analyze', ['periode' => 'hari_ini']);

        $response->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_simulate_tidak_menyimpan_riwayat(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $response = $this->postJson('/api/dss/simulate', [
            'bobot' => ['C1' => 40, 'C2' => 20, 'C3' => 20, 'C4' => 20],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.disimpan', false)
            ->assertJsonPath('data.disimulasikan', true);

        $this->assertDatabaseCount('dss_analisis', 0);
    }

    public function test_kasir_tidak_boleh_menyimpan_analisis(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->kasirUser());

        $this->postJson('/api/dss/analyze', [])->assertStatus(403);
        $this->putJson('/api/dss/criteria', [
            'bobot' => ['C1' => 35, 'C2' => 25, 'C3' => 20, 'C4' => 20],
        ])->assertStatus(403);
    }

    public function test_kasir_tidak_dapat_membuka_modul_dss(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->kasirUser());

        $this->getJson('/api/dss/dashboard')->assertStatus(403);
        $this->getJson('/api/dss/criteria')->assertStatus(403);
        $this->postJson('/api/dss/simulate', [])->assertStatus(403);
    }

    public function test_manager_boleh_analisis_tetapi_tidak_ubah_bobot(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        $this->putJson('/api/dss/criteria', [
            'bobot' => ['C1' => 35, 'C2' => 25, 'C3' => 20, 'C4' => 20],
        ])->assertStatus(403);
    }

    public function test_update_bobot_kriteria_tersimpan(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->putJson('/api/dss/criteria', [
            'bobot' => ['C1' => 40, 'C2' => 20, 'C3' => 20, 'C4' => 20],
        ])
            ->assertOk()
            ->assertJsonPath('data.total_bobot', 100);

        $this->assertDatabaseHas('dss_kriteria', ['kode_kriteria' => 'C1', 'bobot' => 40]);
    }

    public function test_update_bobot_tidak_valid_ditolak(): void
    {
        Sanctum::actingAs($this->adminUser());

        $this->putJson('/api/dss/criteria', [
            'bobot' => ['C1' => 10, 'C2' => 10, 'C3' => 10, 'C4' => 10],
        ])->assertStatus(422);

        $this->assertDatabaseHas('dss_kriteria', ['kode_kriteria' => 'C1', 'bobot' => 35]);
    }

    public function test_riwayat_detail_tidak_ditemukan_mengembalikan_404(): void
    {
        Sanctum::actingAs($this->managerUser());

        $this->getJson('/api/dss/history/999')->assertStatus(404);
    }

    public function test_endpoint_modul_existing_tetap_berfungsi(): void
    {
        $this->seedTpsData();
        Sanctum::actingAs($this->managerUser());

        // Endpoint modul existing yang tidak bergantung pada tabel MIS legacy
        // (knowledge_base / laporan_manajemen / rekomendasi_restock belum punya
        //  migration di repo ini — kondisi pre-existing, tidak diubah oleh DSS).
        $this->getJson('/api/dashboard/stats')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/dashboard/chart?days=7')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/barang')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/kategori')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/transaksi')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/stok-log')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/pembelian')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/supplier')->assertOk()->assertJsonPath('success', true);
        $this->getJson('/api/diskon')->assertOk()->assertJsonPath('success', true);
    }
}
