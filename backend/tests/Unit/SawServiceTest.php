<?php

namespace Tests\Unit;

use App\Services\SawService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SawServiceTest extends TestCase
{
    protected SawService $saw;

    protected function setUp(): void
    {
        parent::setUp();
        $this->saw = new SawService;
    }

    /**
     * Kriteria standar DSS (35/25/20/20) dengan satu kriteria cost.
     */
    protected function kriteria(): array
    {
        return [
            ['kode_kriteria' => 'C1', 'nama_kriteria' => 'Urgensi', 'jenis' => 'benefit', 'satuan' => 'poin'],
            ['kode_kriteria' => 'C2', 'nama_kriteria' => 'Permintaan', 'jenis' => 'benefit', 'satuan' => 'unit'],
            ['kode_kriteria' => 'C3', 'nama_kriteria' => 'Biaya', 'jenis' => 'cost', 'satuan' => 'rupiah'],
            ['kode_kriteria' => 'C4', 'nama_kriteria' => 'Dampak', 'jenis' => 'benefit', 'satuan' => 'poin'],
        ];
    }

    protected function bobot(): array
    {
        return ['C1' => 35.0, 'C2' => 25.0, 'C3' => 20.0, 'C4' => 20.0];
    }

    protected function alternatif(): array
    {
        return [
            [
                'kode_alternatif' => 'ALT-01',
                'nama_alternatif' => 'Barang A',
                'nilai' => ['C1' => 100, 'C2' => 40, 'C3' => 1000000, 'C4' => 80],
            ],
            [
                'kode_alternatif' => 'ALT-02',
                'nama_alternatif' => 'Barang B',
                'nilai' => ['C1' => 50, 'C2' => 20, 'C3' => 500000, 'C4' => 40],
            ],
        ];
    }

    public function test_normalisasi_benefit_dan_cost_sesuai_rumus(): void
    {
        $hasil = $this->saw->hitung($this->kriteria(), $this->alternatif(), $this->bobot());

        // Benefit: Rij = Xij / Max(Xj)
        $this->assertEqualsWithDelta(1.0, $hasil['normalisasi']['ALT-01']['C1'], 0.000001);
        $this->assertEqualsWithDelta(0.5, $hasil['normalisasi']['ALT-02']['C1'], 0.000001);

        // Cost: Rij = Min(Xj) / Xij
        $this->assertEqualsWithDelta(0.5, $hasil['normalisasi']['ALT-01']['C3'], 0.000001);
        $this->assertEqualsWithDelta(1.0, $hasil['normalisasi']['ALT-02']['C3'], 0.000001);
    }

    public function test_skor_preferensi_dan_peringkat_dihitung_benar(): void
    {
        $hasil = $this->saw->hitung($this->kriteria(), $this->alternatif(), $this->bobot());

        // ALT-01: 0.35*1 + 0.25*1 + 0.20*0.5 + 0.20*1 = 0.90
        // ALT-02: 0.35*0.5 + 0.25*0.5 + 0.20*1 + 0.20*0.5 = 0.60
        $this->assertEqualsWithDelta(0.90, $hasil['hasil'][0]['skor'], 0.000001);
        $this->assertEqualsWithDelta(0.60, $hasil['hasil'][1]['skor'], 0.000001);

        $this->assertSame('ALT-01', $hasil['hasil'][0]['kode_alternatif']);
        $this->assertSame(1, $hasil['hasil'][0]['peringkat']);
        $this->assertSame(2, $hasil['hasil'][1]['peringkat']);
    }

    public function test_bobot_harus_berjumlah_seratus(): void
    {
        $this->expectException(ValidationException::class);

        $this->saw->validateBobot($this->kriteria(), [
            'C1' => 50,
            'C2' => 30,
            'C3' => 20,
            'C4' => 20,
        ]);
    }

    public function test_bobot_negatif_ditolak(): void
    {
        $this->expectException(ValidationException::class);

        $this->saw->validateBobot($this->kriteria(), [
            'C1' => -10,
            'C2' => 50,
            'C3' => 40,
            'C4' => 20,
        ]);
    }

    public function test_bobot_kurang_dari_seratus_ditolak(): void
    {
        $this->expectException(ValidationException::class);

        $this->saw->validateBobot($this->kriteria(), [
            'C1' => 30,
            'C2' => 20,
            'C3' => 10,
            'C4' => 10,
        ]);
    }

    public function test_bobot_kriteria_kosong_ditolak(): void
    {
        $this->expectException(ValidationException::class);

        $this->saw->validateBobot($this->kriteria(), [
            'C1' => 35,
            'C2' => 25,
            'C3' => 20,
        ]);
    }

    public function test_bobot_total_seratus_diterima(): void
    {
        $hasil = $this->saw->validateBobot($this->kriteria(), $this->bobot());

        $this->assertSame(100.0, $hasil['total']);
        $this->assertCount(4, $hasil['bobot']);
    }

    public function test_data_kosong_tidak_menyebabkan_error(): void
    {
        $hasil = $this->saw->hitung($this->kriteria(), [], $this->bobot());

        $this->assertSame([], $hasil['hasil']);
        $this->assertSame(0, $hasil['ringkasan']['total_alternatif']);
        $this->assertContains('Tidak ada alternatif yang memenuhi syarat pada periode ini.', $hasil['peringatan']);
    }

    public function test_nilai_tidak_valid_dianggap_nol_dan_diberi_peringatan(): void
    {
        $alternatif = [
            ['kode_alternatif' => 'ALT-01', 'nama_alternatif' => 'A', 'nilai' => ['C1' => 'abc', 'C2' => null, 'C3' => -5, 'C4' => 10]],
        ];

        $hasil = $this->saw->hitung($this->kriteria(), $alternatif, $this->bobot());

        $this->assertSame(0.0, $hasil['hasil'][0]['nilai']['C1']);
        $this->assertSame(0.0, $hasil['hasil'][0]['nilai']['C2']);
        $this->assertSame(0.0, $hasil['hasil'][0]['nilai']['C3']);
        $this->assertNotEmpty($hasil['peringatan']);
    }

    public function test_cost_nol_mendapat_normalisasi_satu(): void
    {
        $alternatif = [
            ['kode_alternatif' => 'ALT-01', 'nama_alternatif' => 'A', 'nilai' => ['C1' => 10, 'C2' => 5, 'C3' => 0, 'C4' => 10]],
            ['kode_alternatif' => 'ALT-02', 'nama_alternatif' => 'B', 'nilai' => ['C1' => 20, 'C2' => 10, 'C3' => 500, 'C4' => 20]],
        ];

        $hasil = $this->saw->hitung($this->kriteria(), $alternatif, $this->bobot());

        $this->assertEqualsWithDelta(1.0, $hasil['normalisasi']['ALT-01']['C3'], 0.000001);
    }

    public function test_skor_seri_mendapat_peringkat_yang_sama(): void
    {
        $alternatif = [
            ['kode_alternatif' => 'ALT-01', 'nama_alternatif' => 'A', 'nilai' => ['C1' => 10, 'C2' => 10, 'C3' => 100, 'C4' => 10]],
            ['kode_alternatif' => 'ALT-02', 'nama_alternatif' => 'B', 'nilai' => ['C1' => 10, 'C2' => 10, 'C3' => 100, 'C4' => 10]],
            ['kode_alternatif' => 'ALT-03', 'nama_alternatif' => 'C', 'nilai' => ['C1' => 5, 'C2' => 5, 'C3' => 200, 'C4' => 5]],
        ];

        $hasil = $this->saw->hitung($this->kriteria(), $alternatif, $this->bobot());

        $this->assertSame(1, $hasil['hasil'][0]['peringkat']);
        $this->assertSame(1, $hasil['hasil'][1]['peringkat']);
        $this->assertSame(3, $hasil['hasil'][2]['peringkat']);
    }

    public function test_rekomendasi_menyebutkan_skor_dan_kriteria(): void
    {
        $hasil = $this->saw->hitung($this->kriteria(), $this->alternatif(), $this->bobot());
        $rekomendasi = $this->saw->buatRekomendasi($hasil['hasil'][0], $hasil['kriteria']);

        $this->assertStringContainsString('Barang A', $rekomendasi);
        $this->assertStringContainsString('peringkat 1', $rekomendasi);
        $this->assertStringContainsString('Urgensi', $rekomendasi);
    }
}
