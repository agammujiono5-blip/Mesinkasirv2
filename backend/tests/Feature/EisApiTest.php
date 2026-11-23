<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\Karyawan;
use App\Models\Kategori;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EisApiTest extends TestCase
{
    use RefreshDatabase;

    private function managerUser(): User
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

    private function barangStokKritis(): Barang
    {
        $kategori = Kategori::create(['nama_kategori' => 'Minuman', 'deskripsi' => 'Kategori uji']);

        return Barang::create([
            'kode_barang' => 'BRG-EIS-001',
            'nama_barang' => 'Kopi Arabika Premium 250g',
            'id_kategori' => $kategori->id_kategori,
            'harga_beli' => 30000,
            'harga_jual' => 45000,
            'stok' => 2,
            'stok_minimum' => 10,
            'satuan' => 'pack',
        ]);
    }

    private function siapkanTransaksi(User $manajer, Barang $barang, ?Carbon $tanggal = null): void
    {
        $transaksi = Transaksi::create([
            'no_transaksi' => 'TRX-EIS-'.str_pad((string) (Transaksi::count() + 1), 4, '0', STR_PAD_LEFT),
            'id_kasir' => $manajer->id_user,
            'tanggal' => $tanggal ?? now()->subDay(),
            'total_harga' => 45000,
            'metode_bayar' => 'cash',
            'status' => 'selesai',
        ]);

        DetailTransaksi::create([
            'id_transaksi' => $transaksi->id_transaksi,
            'id_barang' => $barang->id_barang,
            'jumlah' => 1,
            'harga_satuan' => 45000,
            'harga_setelah_diskon' => 45000,
            'subtotal' => 45000,
        ]);
    }

    public function test_endpoint_executive_mengembalikan_blok_eis(): void
    {
        $manager = $this->managerUser();

        DB::table('knowledge_base')->insert([
            ['judul' => 'Prosedur Tutup Kasir (SOP-KSR-001)', 'kategori' => 'SOP', 'isi' => "1. Hitung kas\n2. Setor kas", 'created_at' => now()],
            ['judul' => 'SOP Restok Gudang (SOP-GDG-002)', 'kategori' => 'SOP', 'isi' => "1. Cek stok\n2. Buat PR", 'created_at' => now()],
        ]);

        $barang = $this->barangStokKritis();

        DB::table('rekomendasi_restock')->insert([
            'id_barang' => $barang->id_barang,
            'jumlah_disarankan' => 20,
            'stok_saat_ini' => 2,
            'stok_minimum' => 10,
            'status' => 'Belum Ditindak',
            'created_at' => now(),
        ]);

        $this->siapkanTransaksi($manager, $barang);

        Sanctum::actingAs($manager);
        $respons = $this->getJson('/api/dashboard/executive?periode=30_hari')->assertOk();
        $eis = $respons->json('data.eis');

        $this->assertIsArray($eis);
        $this->assertCount(8, $eis['kpi_cards']);
        $this->assertContains($eis['tren']['arah'], ['naik', 'turun', 'stabil']);
        $this->assertCount(4, $eis['balanced_scorecard']['dimensi']);
        $this->assertGreaterThanOrEqual(0, $eis['balanced_scorecard']['skor_total']);
        $this->assertLessThanOrEqual(100, $eis['balanced_scorecard']['skor_total']);
        $this->assertCount(3, $eis['proyeksi_omset']['proyeksi']);

        $kodePeringatan = array_column($eis['peringatan_dini'], 'id');
        $this->assertContains('EWS-01', $kodePeringatan, 'Stok kritis seharusnya memicu peringatan dini.');
        $this->assertContains('EWS-03', $kodePeringatan, 'Disposisi pending seharusnya memicu peringatan dini.');

        $kpiStok = collect($eis['kpi_cards'])->firstWhere('id_kpi', 'KPI-08');
        $this->assertSame('merah', $kpiStok['status']);
        $this->assertSame(0, $kpiStok['pencapaian_persen']);
    }

    private function kasirUser(string $username): User
    {
        return User::create([
            'nama' => 'Kasir '.$username,
            'username' => $username,
            'email' => $username.'@pos.local',
            'password' => 'password123',
            'role' => 'kasir',
            'status' => 'aktif',
        ]);
    }

    public function test_kehadiran_shift_dan_sla_dihitung_dari_database(): void
    {
        $manager = $this->managerUser();
        $kasir = Karyawan::factory()->untukUser($this->kasirUser('kasir1'))->create();
        Karyawan::factory()->untukUser($this->kasirUser('kasir2'))->create();

        $barang = $this->barangStokKritis();
        $this->siapkanTransaksi($kasir->user, $barang, now());

        // Karyawan nonaktif tidak dihitung sebagai staf terdaftar.
        Karyawan::factory()->nonaktif()->untukUser($this->kasirUser('kasir3'))->create();

        // Satu disposisi sudah diputuskan, satu masih pending => SLA 50%.
        DB::table('rekomendasi_restock')->insert([
            ['id_barang' => $barang->id_barang, 'jumlah_disarankan' => 5, 'stok_saat_ini' => 2, 'stok_minimum' => 10, 'status' => 'Disetujui', 'created_at' => now()],
            ['id_barang' => $barang->id_barang, 'jumlah_disarankan' => 5, 'stok_saat_ini' => 2, 'stok_minimum' => 10, 'status' => 'Belum Ditindak', 'created_at' => now()],
        ]);

        Sanctum::actingAs($manager);
        $data = $this->getJson('/api/dashboard/executive?periode=30_hari')->json('data');
        $eis = $data['eis'];
        $kpiKehadiran = collect($eis['kpi_cards'])->firstWhere('id_kpi', 'KPI-05');
        $this->assertEquals(50.0, $kpiKehadiran['nilai']);
        $this->assertSame('merah', $kpiKehadiran['status']);
        $this->assertContains('EWS-06', array_column($eis['peringatan_dini'], 'id'));
        $this->assertSame(30, $eis['proyeksi_omset']['total_hari_periode']);

        $dimensiInternal = collect($eis['balanced_scorecard']['dimensi'])->firstWhere('nama', 'Proses Internal');
        $this->assertStringContainsString('SLA administrasi 50.0%', $dimensiInternal['keterangan']);
    }

    public function test_kepatuhan_sop_mengikuti_kesegaran_dokumen(): void
    {
        $manager = $this->managerUser();

        DB::table('knowledge_base')->insert([
            ['judul' => 'SOP Baru (SOP-KSR-001)', 'kategori' => 'SOP', 'isi' => 'Langkah', 'created_at' => now()],
            ['judul' => 'SOP Lama (SOP-KSR-002)', 'kategori' => 'SOP', 'isi' => 'Langkah', 'created_at' => now()->subYears(2)],
            ['judul' => 'Tips Kasir', 'kategori' => 'Tips', 'isi' => 'Tips', 'created_at' => now()->subYears(3)],
        ]);

        Sanctum::actingAs($manager);
        $eis = $this->getJson('/api/dashboard/executive?periode=30_hari')->json('data.eis');

        // 2 SOP, hanya 1 yang diperbarui dalam setahun terakhir => 50%.
        $kpiSop = collect($eis['kpi_cards'])->firstWhere('id_kpi', 'KPI-06');
        $this->assertEquals(50.0, $kpiSop['nilai']);
    }
}
