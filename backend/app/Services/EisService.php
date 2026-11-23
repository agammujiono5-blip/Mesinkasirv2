<?php

namespace App\Services;

use Carbon\Carbon;

class EisService
{
    /** Target margin laba kotor (%) dan AOV (Rp) untuk KPI eksekutif. */
    private const TARGET_MARGIN = 25.0;

    private const TARGET_AOV = 35000.0;

    /** @var array<string, int> */
    private const BATAS_HARI = [
        'hari_ini' => 1,
        '7_hari' => 7,
        '30_hari' => 30,
        'bulan_ini' => 30,
        'kuartal' => 92,
    ];

    /** @var array<string, array{min: float, max: float}> */
    private const RENTANG_NORMALISASI = [
        'margin' => ['min' => 0, 'max' => 40],
        'aov' => ['min' => 0, 'max' => 250000],
        'laba' => ['min' => 0, 'max' => 50000000],
    ];

    /**
     * Menyusun ringkasan Executive Information System dari data agregat dashboards.
     *
     * @param  array<string, mixed>  $stats  Hasil DashboardService::getExecutiveStats()
     * @param  array<string, mixed>  $tps  Data pilar TPS (metrik finansial & transaksi)
     * @param  array<string, mixed>  $oas  Data pilar OAS (administrasi & SDM)
     * @param  array<string, mixed>  $kms  Data pilar KMS (SOP & pengetahuan)
     * @return array<string, mixed>
     */
    public function build(string $periode, array $stats, array $tps, array $oas, array $kms): array
    {
        $angka = fn (array $sumber, string $kunci): float => (float) ($sumber[$kunci] ?? 0);

        $totalHari = self::BATAS_HARI[$periode] ?? 30;
        $omsetPeriode = $angka($tps, 'penjualan_periode');
        $runRateHarian = $totalHari > 0 ? $omsetPeriode / $totalHari : 0;

        $kpiCards = $this->kpiCards($tps, $oas, $kms);
        $tren = $this->tren($tps);
        $scorecard = $this->balancedScorecard($tps, $oas, $kms);
        $peringatanDini = $this->peringatanDini($tps, $oas, $tren);
        $proyeksi = $this->proyeksi($tps, $runRateHarian, $totalHari);

        return [
            'kpi_cards' => $kpiCards,
            'tren' => $tren,
            'balanced_scorecard' => $scorecard,
            'peringatan_dini' => $peringatanDini,
            'proyeksi_omset' => $proyeksi,
            'drill_down' => $this->drillDown($tps, $oas, $kms, $tren),
            'ringkasan_periode' => [
                'periode' => $periode,
                'dihitung_pada' => Carbon::now()->toIso8601String(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $tps
     * @param  array<string, mixed>  $oas
     * @param  array<string, mixed>  $kms
     * @return list<array<string, mixed>>
     */
    private function kpiCards(array $tps, array $oas, array $kms): array
    {
        $omsetPeriode = (float) ($tps['penjualan_periode'] ?? 0);
        $labaKotor = (float) ($tps['laba_kotor_periode'] ?? 0);
        $margin = (float) ($tps['margin_laba_persen'] ?? 0);
        $aov = (float) ($tps['rata_rata_transaksi'] ?? 0);

        $definisi = [
            ['id_kpi' => 'KPI-01', 'nama' => 'Omset Periode', 'nilai' => $omsetPeriode, 'satuan' => 'rupiah', 'target' => $omsetPeriode * 1.1, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-02', 'nama' => 'Laba Kotor Periode', 'nilai' => $labaKotor, 'satuan' => 'rupiah', 'target' => $labaKotor * 1.1, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-03', 'nama' => 'Margin Laba Kotor', 'nilai' => $margin, 'satuan' => 'persen', 'target' => self::TARGET_MARGIN, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-04', 'nama' => 'Rata-rata Nilai Transaksi (AOV)', 'nilai' => $aov, 'satuan' => 'rupiah', 'target' => self::TARGET_AOV, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-05', 'nama' => 'Tingkat Kehadiran Shift', 'nilai' => (float) ($oas['kehadiran_hari_ini_persen'] ?? 0), 'satuan' => 'persen', 'target' => 95.0, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-06', 'nama' => 'Kepatuhan Audit SOP', 'nilai' => (float) ($kms['sop_compliance_rate'] ?? 0), 'satuan' => 'persen', 'target' => 90.0, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-07', 'nama' => 'Kompetensi SDM', 'nilai' => (float) ($kms['rata_rata_kompetensi'] ?? 0), 'satuan' => 'persen', 'target' => 85.0, 'arah_baik' => 'naik'],
            ['id_kpi' => 'KPI-08', 'nama' => 'Barang Stok Kritis', 'nilai' => (float) ($tps['stok_kritis_count'] ?? 0), 'satuan' => 'sku', 'target' => 0.0, 'arah_baik' => 'turun'],
        ];

        return array_map(function (array $kpi): array {
            if ($kpi['target'] <= 0) {
                $pencapaian = $kpi['nilai'] <= 0 ? 100 : 0;
            } elseif ($kpi['arah_baik'] === 'naik') {
                $pencapaian = (int) round(($kpi['nilai'] / $kpi['target']) * 100);
            } else {
                $pencapaian = (int) round((1 - ($kpi['nilai'] / $kpi['target'])) * 100);
            }

            return [
                ...$kpi,
                'pencapaian_persen' => $pencapaian,
                'status' => $this->statusPencapaian($pencapaian),
            ];
        }, $definisi);
    }

    /**
     * @param  array<string, mixed>  $tps
     * @return array<string, mixed>
     */
    private function tren(array $tps): array
    {
        $harian = array_values((array) ($tps['tren_penjualan_harian'] ?? []));

        $omset = array_map(fn (array $d): float => (float) ($d['total'] ?? 0), $harian);
        $jumlahHari = count($omset);
        $total = array_sum($omset);
        $rataRata = $jumlahHari > 0 ? $total / $jumlahHari : 0.0;

        $separuh = intdiv($jumlahHari, 2);
        $awal = array_sum(array_slice($omset, 0, $separuh));
        $akhir = array_sum(array_slice($omset, $jumlahHari - $separuh));
        $perubahan = $awal > 0 ? round((($akhir - $awal) / $awal) * 100, 1) : 0.0;

        $hariTerbaik = null;
        foreach ($harian as $indeks => $data) {
            if ($hariTerbaik === null || $omset[$indeks] > $hariTerbaik['omset']) {
                $hariTerbaik = [
                    'tanggal' => (string) ($data['date'] ?? ''),
                    'omset' => $omset[$indeks],
                ];
            }
        }

        return [
            'arah' => $perubahan > 2 ? 'naik' : ($perubahan < -2 ? 'turun' : 'stabil'),
            'perubahan_persen' => $perubahan,
            'hari_terbaik' => $hariTerbaik,
            'rata_rata_harian' => (int) round($rataRata),
            'hari_tanpa_penjualan' => count(array_filter($omset, fn (float $nilai): bool => $nilai <= 0)),
        ];
    }

    /**
     * @param  array<string, mixed>  $tps
     * @param  array<string, mixed>  $oas
     * @param  array<string, mixed>  $kms
     * @return array<string, mixed>
     */
    private function balancedScorecard(array $tps, array $oas, array $kms): array
    {
        $margin = (float) ($tps['margin_laba_persen'] ?? 0);
        $labaKotor = (float) ($tps['laba_kotor_periode'] ?? 0);
        $aov = (float) ($tps['rata_rata_transaksi'] ?? 0);
        $fcr = (float) ($kms['first_contact_resolution_rate'] ?? 0);
        $sla = (float) ($oas['task_sla_completion_rate'] ?? 0);
        $kepatuhanSop = (float) ($kms['sop_compliance_rate'] ?? 0);
        $kompetensi = (float) ($kms['rata_rata_kompetensi'] ?? 0);
        $penyelesaianTraining = (float) ($kms['pelatihan_completion_rate'] ?? 0);

        $dimensi = [
            [
                'nama' => 'Finansial',
                'skor' => (int) round(
                    $this->normalisasi($margin, 'margin') * 0.5 +
                    $this->normalisasi($labaKotor, 'laba') * 0.5
                ),
                'bobot_persen' => 35,
                'keterangan' => sprintf(
                    'Margin %.1f%% • laba kotor %s%s',
                    $margin,
                    $labaKotor > 0 ? 'positif' : 'belum positif',
                    (float) ($tps['pembelian_periode'] ?? 0) <= 0 ? ' (belum ada data pengadaan)' : ''
                ),
            ],
            [
                'nama' => 'Pelanggan',
                'skor' => (int) round($this->normalisasi($aov, 'aov') * 0.5 + $fcr * 0.5),
                'bobot_persen' => 25,
                'keterangan' => sprintf('Nilai transaksi rata-rata Rp %s • FCR %.1f%%', number_format($aov, 0, ',', '.'), $fcr),
            ],
            [
                'nama' => 'Proses Internal',
                'skor' => (int) round($sla * 0.5 + $kepatuhanSop * 0.5),
                'bobot_persen' => 25,
                'keterangan' => sprintf('SLA administrasi %.1f%% • kepatuhan SOP %.1f%%', $sla, $kepatuhanSop),
            ],
            [
                'nama' => 'Pembelajaran & Pertumbuhan',
                'skor' => (int) round($kompetensi * 0.6 + $penyelesaianTraining * 0.4),
                'bobot_persen' => 15,
                'keterangan' => sprintf('Kompetensi %.1f • penyelesaian training %.1f%%', $kompetensi, $penyelesaianTraining),
            ],
        ];

        foreach ($dimensi as $indeks => $data) {
            $dimensi[$indeks]['status'] = $this->statusSkor($data['skor']);
        }

        $skorTotal = (int) round(array_sum(array_map(
            fn (array $d): float => $d['skor'] * $d['bobot_persen'] / 100,
            $dimensi
        )));

        $predikat = match (true) {
            $skorTotal >= 85 => 'Sangat Sehat',
            $skorTotal >= 70 => 'Sehat',
            $skorTotal >= 55 => 'Perlu Perhatian',
            default => 'Kritis',
        };

        return [
            'dimensi' => $dimensi,
            'skor_total' => $skorTotal,
            'predikat' => $predikat,
        ];
    }

    /**
     * @param  array<string, mixed>  $tps
     * @param  array<string, mixed>  $oas
     * @param  array<string, mixed>  $tren
     * @return list<array<string, mixed>>
     */
    private function peringatanDini(array $tps, array $oas, array $tren): array
    {
        $peringatan = [];
        $stokKritis = collect($tps['stok_kritis_items'] ?? [])
            ->map(fn ($item): array => is_array($item) ? $item : (array) $item->toArray())
            ->values()
            ->all();

        if ($stokKritis !== []) {
            $terburuk = $stokKritis[0];
            foreach ($stokKritis as $item) {
                $rasioTerburuk = (float) $terburuk['stok'] / max((float) $terburuk['stok_minimum'], 1);
                $rasioItem = (float) $item['stok'] / max((float) $item['stok_minimum'], 1);
                if ($rasioItem < $rasioTerburuk) {
                    $terburuk = $item;
                }
            }

            $peringatan[] = [
                'id' => 'EWS-01',
                'kategori' => 'Stok',
                'tingkat' => (float) $terburuk['stok'] <= 0 ? 'kritis' : 'waspada',
                'pesan' => sprintf(
                    '%d SKU berada di/pada batas minimum. Paling kritis: %s (sisa %s %s).',
                    count($stokKritis),
                    $terburuk['nama_barang'],
                    number_format((float) $terburuk['stok'], 0, ',', '.'),
                    $terburuk['satuan'] ?? 'unit'
                ),
                'ambang' => sprintf('stok ≤ stok minimum (%s: %s)', $terburuk['nama_barang'], $terburuk['stok_minimum']),
            ];
        }

        $margin = (float) ($tps['margin_laba_persen'] ?? 0);
        if ($margin < 20) {
            $peringatan[] = [
                'id' => 'EWS-02',
                'kategori' => 'Finansial',
                'tingkat' => 'waspada',
                'pesan' => sprintf('Margin laba kotor %.1f%% berada di bawah ambang 20%%. Pengadaan periode ini perlu dievaluasi.', $margin),
                'ambang' => 'margin < 20%',
            ];
        }

        if ($margin >= 100) {
            $peringatan[] = [
                'id' => 'EWS-07',
                'kategori' => 'Finansial',
                'tingkat' => 'monitor',
                'pesan' => 'Margin tercatat 100% karena belum ada pengadaan yang dibukukan pada periode ini. Angka laba kotor belum mencerminkan HPP sebenarnya.',
                'ambang' => 'margin ≥ 100% (tanpa data pengadaan)',
            ];
        }

        $pendingApproval = (int) ($oas['pending_approval_count'] ?? 0);
        if ($pendingApproval > 0) {
            $peringatan[] = [
                'id' => 'EWS-03',
                'kategori' => 'Administrasi',
                'tingkat' => $pendingApproval >= 3 ? 'kritis' : 'waspada',
                'pesan' => sprintf('%d disposisi pengadaan menunggu keputusan Manager dan menghambat alur gudang.', $pendingApproval),
                'ambang' => 'disposisi pending > 0',
            ];
        }

        if ($tren['arah'] === 'turun') {
            $peringatan[] = [
                'id' => 'EWS-04',
                'kategori' => 'Finansial',
                'tingkat' => $tren['perubahan_persen'] <= -10 ? 'kritis' : 'waspada',
                'pesan' => sprintf('Tren omset harian turun %s%% dibanding paruh awal periode.', abs($tren['perubahan_persen'])),
                'ambang' => 'tren penjualan menurun',
            ];
        }

        if ($tren['hari_tanpa_penjualan'] > 0) {
            $peringatan[] = [
                'id' => 'EWS-05',
                'kategori' => 'Trend',
                'tingkat' => 'monitor',
                'pesan' => sprintf('%d hari tanpa transaksi tercatat pada jendela 7 hari terakhir.', $tren['hari_tanpa_penjualan']),
                'ambang' => 'hari tanpa transaksi > 0',
            ];
        }

        $kehadiran = (float) ($oas['kehadiran_hari_ini_persen'] ?? 0);
        if ($kehadiran < 90) {
            $peringatan[] = [
                'id' => 'EWS-06',
                'kategori' => 'SDM',
                'tingkat' => $kehadiran < 80 ? 'kritis' : 'waspada',
                'pesan' => sprintf('Tingkat kehadiran shift %.1f%% di bawah ambang 90%%. Risiko kekurangan operator POS.', $kehadiran),
                'ambang' => 'kehadiran < 90%',
            ];
        }

        return $peringatan;
    }

    /**
     * @param  array<string, mixed>  $tps
     * @return array<string, mixed>
     */
    private function proyeksi(array $tps, float $runRateHarian, int $totalHari): array
    {
        $proyeksiAkhir = $runRateHarian * $totalHari;
        $transaksiPeriode = (int) ($tps['transaksi_periode'] ?? 0);
        $keyakinan = min(98, max(35, (int) round(40 + $transaksiPeriode * 1.5)));

        return [
            'proyeksi' => [
                ['label' => 'Pesimis', 'batas_bawah' => (int) round($proyeksiAkhir * 0.85), 'batas_atas' => (int) round($proyeksiAkhir * 0.95), 'skenario' => 'Pesimis'],
                ['label' => 'Realistis', 'batas_bawah' => (int) round($proyeksiAkhir * 0.95), 'batas_atas' => (int) round($proyeksiAkhir * 1.05), 'skenario' => 'Realistis'],
                ['label' => 'Optimis', 'batas_bawah' => (int) round($proyeksiAkhir * 1.05), 'batas_atas' => (int) round($proyeksiAkhir * 1.2), 'skenario' => 'Optimis'],
            ],
            'hari_berjalan' => $totalHari,
            'total_hari_periode' => $totalHari,
            'run_rate_harian' => (int) round($runRateHarian),
            'proyeksi_omset_periode_selesai' => (int) round($proyeksiAkhir),
            'confidence_persen' => $keyakinan,
        ];
    }

    /**
     * @param  array<string, mixed>  $tps
     * @param  array<string, mixed>  $oas
     * @param  array<string, mixed>  $kms
     * @param  array<string, mixed>  $tren
     * @return list<array<string, mixed>>
     */
    private function drillDown(array $tps, array $oas, array $kms, array $tren): array
    {
        return [
            ['sumber' => 'TPS', 'dimensi' => 'Omset Periode', 'nilai' => (float) ($tps['penjualan_periode'] ?? 0), 'satuan' => 'rupiah', 'arah' => $tren['arah']],
            ['sumber' => 'TPS', 'dimensi' => 'Volume Transaksi', 'nilai' => (float) ($tps['transaksi_periode'] ?? 0), 'satuan' => 'unit', 'arah' => 'naik'],
            ['sumber' => 'TPS', 'dimensi' => 'Nilai Aset Inventori', 'nilai' => (float) ($tps['nilai_aset_inventori'] ?? 0), 'satuan' => 'rupiah', 'arah' => 'stabil'],
            ['sumber' => 'OAS', 'dimensi' => 'Pengeluaran Disetujui', 'nilai' => (float) ($oas['total_pengeluaran_disetujui'] ?? 0), 'satuan' => 'rupiah', 'arah' => 'naik'],
            ['sumber' => 'OAS', 'dimensi' => 'Dokumen Diproses', 'nilai' => (float) ($oas['dokumen_digital_diproses'] ?? 0), 'satuan' => 'unit', 'arah' => 'naik'],
            ['sumber' => 'KMS', 'dimensi' => 'SOP Aktif', 'nilai' => (float) ($kms['total_sop_aktif'] ?? 0), 'satuan' => 'unit', 'arah' => 'stabil'],
        ];
    }

    private function normalisasi(float $nilai, string $kunci): int
    {
        $rentang = self::RENTANG_NORMALISASI[$kunci];
        $selisih = $rentang['max'] - $rentang['min'];

        if ($selisih <= 0) {
            return 0;
        }

        return (int) max(0, min(100, round((($nilai - $rentang['min']) / $selisih) * 100)));
    }

    private function statusPencapaian(int $pencapaian): string
    {
        return match (true) {
            $pencapaian >= 100 => 'hijau',
            $pencapaian >= 80 => 'kuning',
            default => 'merah',
        };
    }

    private function statusSkor(int $skor): string
    {
        return match (true) {
            $skor >= 80 => 'hijau',
            $skor >= 60 => 'kuning',
            default => 'merah',
        };
    }
}
