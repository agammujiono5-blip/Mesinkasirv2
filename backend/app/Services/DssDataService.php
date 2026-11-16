<?php

namespace App\Services;

use App\Models\Barang;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mengambil & memvalidasi data lintas modul untuk kebutuhan DSS.
 *
 * Sumber data (read-only, tidak menduplikasi tabel):
 * - TPS : transaksi, detail_transaksi, barang, pembelian, stok_log
 * - OAS : rekomendasi_restock (disposisi restok), stok_log (audit penyesuaian)
 * - KMS : knowledge_base (SOP / troubleshooting)
 * - MIS : laporan_manajemen, analisis_penjualan (agregat manajerial)
 *
 * Semua query dibungkus pemeriksaan tabel agar DSS tetap berjalan dan
 * melaporkan status "tidak tersedia" alih-alih error bila tabel belum ada.
 */
class DssDataService
{
    /**
     * Daftar periode yang didukung DSS.
     */
    public const PERIODE = [
        'hari_ini' => 'Hari Ini',
        '7_hari' => '7 Hari Terakhir',
        '30_hari' => '30 Hari Terakhir',
        'kuartal' => 'Kuartal Berjalan',
        'all_time' => 'Seluruh Riwayat Data',
    ];

    public function __construct(protected SawService $sawService) {}

    /**
     * Ubah kode periode menjadi rentang tanggal.
     *
     * @return array{kode: string, label: string, awal: ?string, akhir: ?string, hari: int}
     */
    public function resolvePeriode(string $periode): array
    {
        $periode = array_key_exists($periode, self::PERIODE) ? $periode : 'all_time';
        $today = Carbon::today();

        [$awal, $akhir, $hari] = match ($periode) {
            'hari_ini' => [$today->copy(), $today->copy(), 1],
            '7_hari' => [$today->copy()->subDays(6), $today->copy(), 7],
            '30_hari' => [$today->copy()->subDays(29), $today->copy(), 30],
            'kuartal' => [$today->copy()->startOfQuarter(), $today->copy(), max(1, $today->copy()->startOfQuarter()->diffInDays($today) + 1)],
            default => [null, null, 0],
        };

        return [
            'kode' => $periode,
            'label' => self::PERIODE[$periode],
            'awal' => $awal?->toDateString(),
            'akhir' => $akhir?->toDateString(),
            'hari' => (int) $hari,
        ];
    }

    /**
     * Kriteria aktif DSS, terurut sesuai kolom urutan.
     */
    public function getKriteria(bool $hanyaAktif = true): array
    {
        if (! Schema::hasTable('dss_kriteria')) {
            return [];
        }

        $query = DB::table('dss_kriteria')->orderBy('urutan')->orderBy('kode_kriteria');

        if ($hanyaAktif) {
            $query->where('aktif', 1);
        }

        return $query->get()->map(fn ($row) => [
            'id_kriteria' => (int) $row->id_kriteria,
            'kode_kriteria' => $row->kode_kriteria,
            'nama_kriteria' => $row->nama_kriteria,
            'deskripsi' => $row->deskripsi,
            'jenis' => $row->jenis,
            'bobot' => (float) $row->bobot,
            'satuan' => $row->satuan,
            'urutan' => (int) $row->urutan,
            'aktif' => (bool) $row->aktif,
        ])->all();
    }

    /**
     * Status integrasi tiap sumber data (TPS, OAS, KMS, MIS).
     *
     * @return array<int, array<string, mixed>>
     */
    public function getSumberData(): array
    {
        $tpsTransaksi = $this->tableInfo('transaksi', 'tanggal');
        $tpsDetail = $this->tableInfo('detail_transaksi', 'created_at');
        $tpsBarang = $this->tableInfo('barang', 'updated_at');
        $tpsPembelian = $this->tableInfo('pembelian', 'tanggal');

        $oasRestock = $this->tableInfo('rekomendasi_restock', 'created_at');
        $oasStokLog = $this->tableInfo('stok_log', 'created_at');

        $kmsKnowledge = $this->tableInfo('knowledge_base', 'updated_at');

        $misLaporan = $this->tableInfo('laporan_manajemen', 'created_at');
        $misAnalisis = $this->tableInfo('analisis_penjualan', 'created_at');

        $statusTps = $this->statusDari([$tpsTransaksi, $tpsDetail, $tpsBarang, $tpsPembelian]);
        $statusOas = $this->statusDari([$oasRestock, $oasStokLog]);
        $statusKms = $this->statusDari([$kmsKnowledge]);
        $statusMis = $this->statusDari([$misLaporan, $misAnalisis]);

        return [
            [
                'modul' => 'TPS',
                'nama' => 'Transaction Processing System',
                'status' => $statusTps,
                'tabel' => ['transaksi', 'detail_transaksi', 'barang', 'pembelian'],
                'jumlah_record' => $tpsTransaksi['jumlah'] + $tpsDetail['jumlah'] + $tpsBarang['jumlah'] + $tpsPembelian['jumlah'],
                'terakhir_update' => $this->terakhirDari([$tpsTransaksi, $tpsDetail, $tpsBarang, $tpsPembelian]),
                'dipakai_untuk' => 'Volume permintaan, pendapatan, harga beli, dan ketersediaan stok',
                'keterangan' => $tpsTransaksi['jumlah'] > 0
                    ? "{$tpsTransaksi['jumlah']} transaksi & {$tpsBarang['jumlah']} SKU terbaca dari database operasional."
                    : 'Belum ada transaksi tercatat pada tabel transaksi.',
            ],
            [
                'modul' => 'OAS',
                'nama' => 'Office Automation System',
                'status' => $statusOas,
                'tabel' => ['rekomendasi_restock', 'stok_log'],
                'jumlah_record' => $oasRestock['jumlah'] + $oasStokLog['jumlah'],
                'terakhir_update' => $this->terakhirDari([$oasRestock, $oasStokLog]),
                'dipakai_untuk' => 'Disposisi restok yang menunggu persetujuan & audit penyesuaian stok',
                'keterangan' => $oasRestock['jumlah'] > 0
                    ? "{$oasRestock['jumlah']} disposisi restok dan {$oasStokLog['jumlah']} log audit stok terbaca."
                    : 'Belum ada disposisi restok / log audit stok.',
            ],
            [
                'modul' => 'KMS',
                'nama' => 'Knowledge Management System',
                'status' => $statusKms,
                'tabel' => ['knowledge_base'],
                'jumlah_record' => $kmsKnowledge['jumlah'],
                'terakhir_update' => $kmsKnowledge['terakhir'],
                'dipakai_untuk' => 'Rujukan SOP & panduan pada penjelasan rekomendasi keputusan',
                'keterangan' => $kmsKnowledge['jumlah'] > 0
                    ? "{$kmsKnowledge['jumlah']} artikel SOP/troubleshooting siap dirujuk pada rekomendasi."
                    : 'Repositori pengetahuan belum berisi artikel.',
            ],
            [
                'modul' => 'MIS',
                'nama' => 'Management Information System',
                'status' => $statusMis,
                'tabel' => ['laporan_manajemen', 'analisis_penjualan'],
                'jumlah_record' => $misLaporan['jumlah'] + $misAnalisis['jumlah'],
                'terakhir_update' => $this->terakhirDari([$misLaporan, $misAnalisis]),
                'dipakai_untuk' => 'Laporan manajemen & agregat penjualan sebagai konteks keputusan',
                'keterangan' => $misLaporan['jumlah'] > 0
                    ? "{$misLaporan['jumlah']} laporan manajemen tersedia; agregat analisis_penjualan berisi {$misAnalisis['jumlah']} baris."
                    : 'Laporan manajemen belum tersedia; DSS menghitung indikator langsung dari TPS.',
            ],
        ];
    }

    /**
     * Data mentah alternatif + nilai tiap kriteria, dihitung dari sumber existing.
     *
     * @param  array<string, mixed>|null  $konteksEs  konteks diagnosa ES (bila null, dibaca dari riwayat ES)
     * @return array<string, mixed>
     */
    public function getAlternatif(string $periode = 'all_time', string $scope = 'relevan', ?array $konteksEs = null): array
    {
        $rentang = $this->resolvePeriode($periode);
        $kriteria = $this->getKriteria();
        $kodeKriteria = array_column($kriteria, 'kode_kriteria');

        $peringatan = [];

        if (empty($kriteria)) {
            return [
                'periode' => $rentang,
                'alternatif' => [],
                'peringatan' => ['Kriteria DSS belum tersedia. Jalankan seeder DssKriteriaSeeder.'],
            ];
        }

        if (! Schema::hasTable('barang') || ! Schema::hasTable('transaksi') || ! Schema::hasTable('detail_transaksi')) {
            return [
                'periode' => $rentang,
                'alternatif' => [],
                'peringatan' => ['Tabel inti TPS (barang/transaksi/detail_transaksi) tidak ditemukan pada database.'],
            ];
        }

        // Rentang data aktual (untuk periode all_time & validasi ketersediaan data).
        $rentangData = $this->rentangDataTransaksi();
        $hariEfektif = $this->hariEfektif($rentang, $rentangData);
        $transaksiPeriode = $this->hitungTransaksiPeriode($rentang);

        if ($transaksiPeriode === 0) {
            $peringatan[] = $rentang['awal']
                ? "Tidak ada transaksi selesai pada {$rentang['label']} ({$rentang['awal']} s.d. {$rentang['akhir']}). Nilai permintaan & dampak layanan akan bernilai 0."
                : 'Belum ada transaksi selesai pada database.';
        }

        if ($rentangData['terakhir'] && $rentang['akhir'] && $rentangData['terakhir'] < $rentang['akhir']) {
            $peringatan[] = "Transaksi terakhir tercatat {$rentangData['terakhir']}, lebih lama dari akhir periode ({$rentang['akhir']}).";
        }

        // Agregat penjualan per barang (TPS) sesuai periode.
        $penjualan = $this->agregatPenjualan($rentang);

        // Disposisi restok (OAS) per barang.
        $restock = $this->agregatRestock();

        // Konteks diagnosa Expert System (baca-saja dari riwayat ES tersimpan).
        $konteksEs ??= $this->konteksEsDariEs();
        $diagnosaEsTersedia = (bool) ($konteksEs['tersedia'] ?? false);
        $kodeEs = $konteksEs['kode_kerusakan'] ?? null;
        $cfEs = $diagnosaEsTersedia ? max(0.0, min(1.0, (float) ($konteksEs['cf_akhir'] ?? 0))) : 0.0;
        $barangTerpengaruhEs = $diagnosaEsTersedia ? ($konteksEs['barang_terdampak'] ?? []) : [];

        $barangList = Barang::with(['kategori', 'supplier'])->orderBy('id_barang')->get();

        $totalPendapatanPeriode = (float) $penjualan->sum(fn ($row) => (float) ($row->total_pendapatan ?? 0));

        $kandidat = [];
        foreach ($barangList as $barang) {
            $terjual = (float) ($penjualan[$barang->id_barang]->total_terjual ?? 0);
            $pendapatan = (float) ($penjualan[$barang->id_barang]->total_pendapatan ?? 0);
            $frekuensi = (int) ($penjualan[$barang->id_barang]->frekuensi ?? 0);

            $relevan = $terjual > 0 || (int) $barang->stok <= (int) $barang->stok_minimum;
            if ($scope === 'kritis') {
                $relevan = (int) $barang->stok <= (int) $barang->stok_minimum;
            }
            if (! $relevan) {
                continue;
            }

            $disposisi = $restock[$barang->id_barang] ?? null;
            $statusRestock = $disposisi->status ?? null;
            $disposisiPending = $disposisi && ! in_array($statusRestock, ['Disetujui', 'Ditolak', 'Selesai'], true);

            $stok = (int) $barang->stok;
            $stokMinimum = (int) $barang->stok_minimum;

            // Jumlah restok yang disarankan: pakai disposisi OAS bila ada, jika tidak hitung buffer.
            $jumlahDisarankan = $disposisi->jumlah_disarankan ?? null;
            if ($jumlahDisarankan === null || (int) $jumlahDisarankan <= 0) {
                $jumlahDisarankan = max($stokMinimum * 2 - $stok, max(1, $stokMinimum));
            }
            $jumlahDisarankan = (int) $jumlahDisarankan;

            // C1 - Urgensi kebutuhan (benefit, 0-100).
            $lajuHarian = $hariEfektif > 0 ? $terjual / $hariEfektif : 0;
            $coverageHari = $lajuHarian > 0 ? $stok / $lajuHarian : ($stok > 0 ? 365 : 0);
            $urgensi = 100 * (1 - min(1, $coverageHari / 30));
            if ($stok <= $stokMinimum) {
                $urgensi = max($urgensi, 85);
            }
            if ($disposisiPending) {
                $urgensi = min(100, $urgensi + 10);
            }

            // Penyesuaian dari diagnosa ES (hanya bila SKU tersebut disebut buktinya).
            $esMenyebut = $diagnosaEsTersedia && in_array($barang->kode_barang, $barangTerpengaruhEs, true);
            $penyesuaianEs = 0.0;
            if ($diagnosaEsTersedia) {
                if ($kodeEs === 'K02') {
                    // Kebutuhan restok mendesak (K02) mencakup seluruh SKU yang
                    // berada di bawah minimum; ~+20 poin pada keyakinan penuh.
                    $penyesuaianEs += ($esMenyebut || $stok <= $stokMinimum) ? 20 * $cfEs : 0;
                } elseif ($esMenyebut) {
                    // Diagnosa ES menandai SKU ini bermasalah (mis. menumpuk).
                    $penyesuaianEs += 15 * $cfEs;
                }
            }

            $urgensi = round(max(0, min(100, $urgensi + $penyesuaianEs)), 2);

            // C2 - Tingkat permintaan (benefit): unit terjual pada periode.
            $permintaan = round($terjual, 2);

            // C3 - Biaya pengadaan (cost): estimasi harga beli x jumlah restok.
            $biaya = round((float) $barang->harga_beli * $jumlahDisarankan, 2);

            // C4 - Dampak layanan (benefit, 0-100): kontribusi pendapatan + risiko stockout.
            $kontribusi = $totalPendapatanPeriode > 0 ? ($pendapatan / $totalPendapatanPeriode) * 100 : 0;
            $risiko = 100 * (1 - min(1, $coverageHari / 30));
            $dampak = round(min(100, ($kontribusi * 0.6) + ($risiko * 0.4)), 2);

            $nilai = [
                'C1' => $urgensi,
                'C2' => $permintaan,
                'C3' => $biaya,
                'C4' => $dampak,
            ];

            // Hanya sertakan kode kriteria yang benar-benar aktif di database.
            $nilai = array_intersect_key($nilai, array_flip($kodeKriteria));

            $kandidat[] = [
                'id_barang' => (int) $barang->id_barang,                'kode_alternatif' => $barang->kode_barang,
                'nama_alternatif' => $barang->nama_barang,
                'kategori' => $barang->kategori->nama_kategori ?? 'Umum',
                'supplier' => $barang->supplier->nama_supplier ?? null,
                'stok' => $stok,
                'stok_minimum' => $stokMinimum,
                'satuan' => $barang->satuan,
                'harga_beli' => (float) $barang->harga_beli,
                'harga_jual' => (float) $barang->harga_jual,
                'terjual' => $terjual,
                'pendapatan' => $pendapatan,
                'frekuensi_transaksi' => $frekuensi,
                'jumlah_disarankan' => $jumlahDisarankan,
                'status_restock' => $statusRestock,
                'disposisi_pending' => (bool) $disposisiPending,
                'es_menandai' => $diagnosaEsTersedia ? $esMenyebut : false,
                'diagnosa_es' => $diagnosaEsTersedia ? [
                    'kode_kerusakan' => $kodeEs,                    'nama_kerusakan' => $konteksEs['nama_kerusakan'] ?? null,
                    'persentase' => $konteksEs['persentase'] ?? null,
                ] : null,
                'nilai' => $nilai,
                'dasar_nilai' => [
                    'C1' => sprintf(
                        'Coverage stok %.1f hari; stok %d %s (minimum %d)%s%s',
                        min($coverageHari, 365),
                        $stok,
                        $barang->satuan,
                        $stokMinimum,
                        $disposisiPending ? '; ada disposisi restok menunggu approval' : '',
                        $penyesuaianEs > 0
                            ? sprintf('; diagnosis ES %s (%s) menyesuaikan urgensi %+.1f', $kodeEs, $konteksEs['persentase'] ?? '-', $penyesuaianEs)
                            : ''
                    ),
                    'C2' => sprintf('%s unit terjual dalam %s', number_format($terjual, 0, ',', '.'), $rentang['label']),
                    'C3' => sprintf('Estimasi %s unit x Rp %s', number_format($jumlahDisarankan, 0, ',', '.'), number_format((float) $barang->harga_beli, 0, ',', '.')),
                    'C4' => sprintf('Kontribusi pendapatan %.2f%% dengan risiko stockout %.1f%%', $kontribusi, $risiko),
                ],
            ];
        }

        // Normalisasi kode alternatif unik (ALT-01, ALT-02, ...).
        foreach ($kandidat as $index => &$row) {
            $row['kode_alternatif'] = 'ALT-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
            $row['kode_barang'] = $barangList->firstWhere('id_barang', $row['id_barang'])->kode_barang ?? null;
        }
        unset($row);

        if (empty($kandidat)) {
            $peringatan[] = 'Tidak ada alternatif relevan. Semua stok di atas minimum dan belum ada penjualan.';
        }

        return [
            'periode' => array_merge($rentang, [
                'hari_efektif' => $hariEfektif,
                'transaksi_periode' => $transaksiPeriode,
                'data_terakhir' => $rentangData['terakhir'],
                'data_pertama' => $rentangData['pertama'],
            ]),
            'alternatif' => $kandidat,
            'konteks_es' => $konteksEs,
            'peringatan' => $peringatan,
        ];
    }

    /**
     * Baca konteks ES tanpa bergantung pada orkestrator untuk menghindari
     * ketergantungan melingkar (DssService -> DssDataService -> DssService).
     *
     * @return array<string, mixed>
     */
    protected function konteksEsDariEs(): array
    {
        try {
            return app(ExpertSystemService::class)->getDiagnosaTerbaru() ?? ['tersedia' => false];
        } catch (\Throwable) {
            return ['tersedia' => false];
        }
    }

    /**
     * Agregat penjualan per barang pada rentang periode.
     *
     * @param  array<string, mixed>  $rentang
     * @return Collection<int, object>
     */
    protected function agregatPenjualan(array $rentang)
    {
        $query = DB::table('detail_transaksi')
            ->join('transaksi', 'detail_transaksi.id_transaksi', '=', 'transaksi.id_transaksi')
            ->where('transaksi.status', 'selesai')
            ->select(
                'detail_transaksi.id_barang',
                DB::raw('SUM(detail_transaksi.jumlah) as total_terjual'),
                DB::raw('SUM(detail_transaksi.subtotal) as total_pendapatan'),
                DB::raw('COUNT(DISTINCT detail_transaksi.id_transaksi) as frekuensi')
            )
            ->groupBy('detail_transaksi.id_barang');

        if ($rentang['awal']) {
            $query->whereDate('transaksi.tanggal', '>=', $rentang['awal']);
        }
        if ($rentang['akhir']) {
            $query->whereDate('transaksi.tanggal', '<=', $rentang['akhir']);
        }

        return $query->get()->keyBy('id_barang');
    }

    /**
     * Disposisi restok OAS per barang (baris terbaru).
     *
     * @return Collection<int, object>
     */
    protected function agregatRestock()
    {
        if (! Schema::hasTable('rekomendasi_restock')) {
            return collect();
        }

        return DB::table('rekomendasi_restock')
            ->orderByDesc('id_rekomendasi')
            ->get()
            ->unique('id_barang')
            ->keyBy('id_barang');
    }

    /**
     * Rentang tanggal transaksi selesai yang tersedia.
     *
     * @return array{pertama: ?string, terakhir: ?string, total: int}
     */
    public function rentangDataTransaksi(): array
    {
        if (! Schema::hasTable('transaksi')) {
            return ['pertama' => null, 'terakhir' => null, 'total' => 0];
        }

        $row = DB::table('transaksi')
            ->where('status', 'selesai')
            ->selectRaw('MIN(tanggal) as pertama, MAX(tanggal) as terakhir, COUNT(*) as total')
            ->first();

        return [
            'pertama' => $row && $row->pertama ? substr((string) $row->pertama, 0, 10) : null,
            'terakhir' => $row && $row->terakhir ? substr((string) $row->terakhir, 0, 10) : null,
            'total' => (int) ($row->total ?? 0),
        ];
    }

    /**
     * Hitung jumlah hari efektif untuk menghitung laju permintaan harian.
     *
     * @param  array<string, mixed>  $rentang
     * @param  array<string, mixed>  $rentangData
     */
    protected function hariEfektif(array $rentang, array $rentangData): int
    {
        if ($rentang['awal'] && $rentang['akhir']) {
            return max(1, (int) $rentang['hari']);
        }

        if ($rentangData['pertama'] && $rentangData['terakhir']) {
            return max(1, Carbon::parse($rentangData['pertama'])->diffInDays(Carbon::parse($rentangData['terakhir'])) + 1);
        }

        return 1;
    }

    /**
     * Jumlah transaksi selesai pada periode.
     *
     * @param  array<string, mixed>  $rentang
     */
    protected function hitungTransaksiPeriode(array $rentang): int
    {
        if (! Schema::hasTable('transaksi')) {
            return 0;
        }

        $query = DB::table('transaksi')->where('status', 'selesai');

        if ($rentang['awal']) {
            $query->whereDate('tanggal', '>=', $rentang['awal']);
        }
        if ($rentang['akhir']) {
            $query->whereDate('tanggal', '<=', $rentang['akhir']);
        }

        return (int) $query->count();
    }

    /**
     * Info singkat sebuah tabel: keberadaan, jumlah baris, dan timestamp terakhir.
     *
     * @return array{ada: bool, jumlah: int, terakhir: ?string}
     */
    protected function tableInfo(string $table, ?string $kolomWaktu = null): array
    {
        if (! Schema::hasTable($table)) {
            return ['ada' => false, 'jumlah' => 0, 'terakhir' => null];
        }

        $jumlah = (int) DB::table($table)->count();
        $terakhir = null;

        if ($kolomWaktu && Schema::hasColumn($table, $kolomWaktu) && $jumlah > 0) {
            $nilai = DB::table($table)->max($kolomWaktu);
            $terakhir = $nilai ? Carbon::parse($nilai)->toDateTimeString() : null;
        }

        return ['ada' => true, 'jumlah' => $jumlah, 'terakhir' => $terakhir];
    }

    /**
     * @param  array<int, array{ada: bool, jumlah: int, terakhir: ?string}>  $tabel
     */
    protected function statusDari(array $tabel): string
    {
        $ada = count(array_filter($tabel, fn ($t) => $t['ada']));
        $berisi = count(array_filter($tabel, fn ($t) => $t['ada'] && $t['jumlah'] > 0));

        if ($ada === 0) {
            return 'tidak_tersedia';
        }

        if ($berisi === 0) {
            return 'kosong';
        }

        if ($berisi < count($tabel)) {
            return 'sebagian';
        }

        return 'terhubung';
    }

    /**
     * @param  array<int, array{ada: bool, jumlah: int, terakhir: ?string}>  $tabel
     */
    protected function terakhirDari(array $tabel): ?string
    {
        $waktu = array_filter(array_column($tabel, 'terakhir'));

        return empty($waktu) ? null : max($waktu);
    }
}
