<?php

namespace App\Services;

use App\Models\Barang;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Penilai gejala Expert System dari data lintas modul (read-only).
 *
 * Alur dua arah yang dipakai:
 * - ES membaca TPS (stok, penjualan, transaksi, diskon, stok_log), OAS
 *   (disposisi restok), KMS (SOP), MIS (laporan & agregat), dan DSS (peringkat
 *   SAW) untuk menilai gejala secara otomatis.
 * - DSS kembali memakai hasil ES untuk menyusun prioritas restok (dipakai di
 *   DssDataService), sehingga rantai TPS → OAS → KMS → MIS → DSS → ES
 *   benar-benar dua arah.
 *
 * Arah pemicu tetap satu: ES selalu dihitung dari data yang ada saat itu
 * (live), sedangkan DSS hanya membaca diagnosa ES yang SUDAH tersimpan.
 * Dengan demikian DSS tidak pernah memicu perhitungan ES, dan DSS tidak
 * pernah memakai basis pengetahuan ES untuk menilai bukti ES lagi
 * (kriteria DSS tidak menyertakan "diagnosa ES"), sehingga tidak ada rekursi.
 *
 * Semua query dibungkus pemeriksaan tabel agar ES tetap berjalan dan
 * melaporkan status "tidak tersedia" alih-alih error.
 */
class EsDataService
{
    public const PERIODE = [
        '7_hari' => '7 Hari Terakhir',
        '30_hari' => '30 Hari Terakhir',
        '90_hari' => '90 Hari Terakhir',
        'all_time' => 'Seluruh Riwayat Data',
    ];

    /** BATAS hari tanpa penjualan sebelum SKU dianggap tidak berputar. */
    public const BATAS_TIDAK_BERPUTAR_HARI = 30;

    /** Selisih omzet (%) yang dianggap turun bermakna. */
    public const BATAS_PENURUNAN_PERSEN = 15;

    /** Rentang hari ke depan yang dianggap "mendekati kedaluwarsa". */
    public const BATAS_KEDALUWARSA_HARI = 30;

    /** Rasio transaksi pending/batal yang dianggap banyak. */
    public const BATAS_RASIO_TRANSAKSI_BERMASALAH = 0.10;

    /**
     * Nilai seluruh gejala dari data operasional.
     *
     * @return array{
     *     gejala: array<string, float>,
     *     bukti: array<string, array<string, mixed>>,
     *     sumber_data: array<int, array<string, mixed>>,
     *     ringkasan: array<string, mixed>,
     *     daftar_periode: array<int, array<string, mixed>>
     * }
     */
    public function nilaiGejala(string $periode = '90_hari'): array
    {
        $periode = array_key_exists($periode, self::PERIODE) ? $periode : '90_hari';
        $rentang = $this->resolvePeriode($periode);

        $bukti = [];
        $gejala = [];

        $tambah = function (string $kode, float $cf, array $b) use (&$gejala, &$bukti): void {
            if ($cf <= 0) {
                return;
            }

            $gejala[$kode] = round(min(1.0, $cf), 4);
            $bukti[$kode] = $b;
        };

        // --- TPS: stok & inventori ---
        $stok = $this->analisisStok($rentang);

        $tambah('G05', $stok['g05'], $stok['bukti_g05']);
        $tambah('G06', $stok['g06'], $stok['bukti_g06']);
        $tambah('G07', $stok['g07'], $stok['bukti_g07']);
        $tambah('G04', $stok['g04'], $stok['bukti_g04']);
        $tambah('G08', $stok['g08'], $stok['bukti_g08']);

        // --- TPS: pergerakan stok & transaksi ---
        $transaksi = $this->analisisTransaksi($rentang);

        $tambah('G02', $transaksi['g02'], $transaksi['bukti_g02']);
        $tambah('G13', $transaksi['g13'], $transaksi['bukti_g13']);
        $tambah('G14', $transaksi['g14'], $transaksi['bukti_g14']);
        $tambah('G11', $transaksi['g11'], $transaksi['bukti_g11']);
        $tambah('G12', $transaksi['g12'], $transaksi['bukti_g12']);

        // --- TPS: harga & diskon ---
        $harga = $this->analisisHargaDiskon();

        $tambah('G09', $harga['g09'], $harga['bukti_g09']);
        $tambah('G10', $harga['g10'], $harga['bukti_g10']);

        // --- TPS: kualitas data master ---
        $master = $this->analisisDataMaster();

        $tambah('G17', $master['g17'], $master['bukti_g17']);
        $tambah('G18', $master['g18'], $master['bukti_g18']);

        // --- OAS: audit stok & disposisi ---
        $audit = $this->analisisAuditStok($rentang);

        $tambah('G19', $audit['g19'], $audit['bukti_g19']);
        $tambah('G20', $audit['g20'], $audit['bukti_g20']);

        // --- DSS: peringkat SAW sebagai bukti cerdas ---
        $dss = $this->analisisDss();

        $tambah('G04', max($gejala['G04'] ?? 0, $dss['g04']), ($gejala['G04'] ?? 0) >= $dss['g04'] ? ($bukti['G04'] ?? []) : $dss['bukti_g04']);

        // Gejala fisik (G01, G15, G16) memerlukan hitung fisik & tutup kasir,
        // tidak dapat disimpulkan dari database sehingga tetap input manual.

        return [
            'periode' => $rentang,
            'gejala' => $gejala,
            'bukti' => $bukti,
            'sumber_data' => $this->statusSumber($rentang),
            'ringkasan' => [
                'periode_label' => $rentang['label'],
                'total_gejala_terdeteksi' => count($gejala),
                'total_barang' => $this->hitungBarang(),
                'total_transaksi_periode' => $transaksi['total_transaksi'],
            ],
            'daftar_periode' => collect(self::PERIODE)
                ->map(fn (string $label, string $kode) => ['kode' => $kode, 'label' => $label])
                ->values()
                ->all(),
        ];
    }

    /**
     * Ubah kode periode menjadi rentang tanggal.
     *
     * @return array{kode: string, label: string, awal: ?string, akhir: ?string, hari: int}
     */
    public function resolvePeriode(string $periode): array
    {
        $periode = array_key_exists($periode, self::PERIODE) ? $periode : '90_hari';
        $today = Carbon::today();

        [$awal, $akhir, $hari] = match ($periode) {
            '7_hari' => [$today->copy()->subDays(6), $today->copy(), 7],
            '30_hari' => [$today->copy()->subDays(29), $today->copy(), 30],
            '90_hari' => [$today->copy()->subDays(89), $today->copy(), 90],
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
     * Gejala stok: di bawah minimum, menumpuk, modal terikat, sering habis,
     * dan mendekati kedaluwarsa.
     *
     * @param  array<string, mixed>  $rentang
     * @return array<string, mixed>
     */
    protected function analisisStok(array $rentang): array
    {
        if (! Schema::hasTable('barang')) {
            return $this->kosong(['g04', 'g05', 'g06', 'g07', 'g08']);
        }

        $barang = $this->ambilBarang();
        $terjual = $this->agregatPenjualan($rentang);
        $hariEfektif = $this->hariEfektif($rentang);
        $terakhirJual = $this->tanggalTerakhirPenjualan();
        $hariIni = Carbon::today();

        $dibawahMinimum = [];
        $menumpuk = [];
        $modalTerikat = 0.0;
        $seringHabis = [];
        $kedaluwarsa = [];

        foreach ($barang as $row) {
            $stok = (int) $row->stok;
            $minimum = (int) $row->stok_minimum;
            $terjualBarang = (float) ($terjual[$row->id_barang]->total_terjual ?? 0);
            $lajuHarian = $hariEfektif > 0 ? $terjualBarang / $hariEfektif : 0;

            // Stok di bawah / sama dengan minimum.
            if ($stok <= $minimum) {
                $dibawahMinimum[] = $this->ringkasBarang($row, [
                    'keterangan' => sprintf('Stok %d %s ≤ minimum %d', $stok, $row->satuan, $minimum),
                ]);
            }

            // SKU tidak berputar: tidak terjual pada periode dan stok signifikan.
            $jualTerakhir = $terakhirJual[$row->id_barang] ?? null;
            $hariTanpaJual = $jualTerakhir
                ? Carbon::parse($jualTerakhir)->diffInDays($hariIni)
                : ($row->created_at ? Carbon::parse($row->created_at)->diffInDays($hariIni) : 999);

            $ambang = max($minimum, 1);
            if ($stok > $ambang && $terjualBarang <= 0 && $hariTanpaJual >= self::BATAS_TIDAK_BERPUTAR_HARI) {
                $menumpuk[] = $this->ringkasBarang($row, [
                    'keterangan' => sprintf(
                        'Stok %d %s, tanpa penjualan %s hari',
                        $stok,
                        $row->satuan,
                        $hariTanpaJual >= 999 ? '>30' : (int) $hariTanpaJual
                    ),
                    'nilai_terikat' => round($stok * (float) $row->harga_beli, 2),
                ]);

                $modalTerikat += $stok * (float) $row->harga_beli;
            }

            // Sering habis: coverage stok ≤ 7 hari pada pola jual teratur.
            $coverage = $lajuHarian > 0 ? $stok / $lajuHarian : null;
            if ($coverage !== null && $coverage <= 7) {
                $seringHabis[] = $this->ringkasBarang($row, [
                    'keterangan' => sprintf(
                        'Stok %d %s hanya cukup %.1f hari (rata-rata %.2f %s/hari)',
                        $stok,
                        $row->satuan,
                        $coverage,
                        $lajuHarian,
                        $row->satuan
                    ),
                ]);
            }

            // Kedaluwarsa: nama/deskripsi memuat tanggal, atau usia stok tua.
            $usiaHari = $row->created_at ? Carbon::parse($row->created_at)->diffInDays($hariIni) : 0;
            $tglKedaluwarsa = $this->cariTanggalKedaluwarsa($row);

            if ($tglKedaluwarsa !== null) {
                $sisa = $hariIni->diffInDays($tglKedaluwarsa, false);

                if ($sisa <= self::BATAS_KEDALUWARSA_HARI) {
                    $kedaluwarsa[] = $this->ringkasBarang($row, [
                        'keterangan' => $sisa < 0
                            ? sprintf('Sudah melewati tanggal kedaluwarsa %s', $tglKedaluwarsa->toDateString())
                            : sprintf('Tersisa %d hari menuju kedaluwarsa (%s)', $sisa, $tglKedaluwarsa->toDateString()),
                    ]);
                }
            } elseif ($stok > $ambang && $usiaHari >= 180) {
                $kedaluwarsa[] = $this->ringkasBarang($row, [
                    'keterangan' => sprintf('Stok lama: %d hari sejak masuk, risiko masa simpan habis', (int) $usiaHari),
                ]);
            }
        }

        return [
            'g05' => $this->hitungCf(count($dibawahMinimum), $barang->count(), 0.9),
            'bukti_g05' => $this->paketBukti(
                'barang',
                sprintf('%d dari %d SKU berada di bawah/tepat pada stok minimum.', count($dibawahMinimum), $barang->count()),
                $dibawahMinimum
            ),
            'g06' => $this->hitungCf(count($menumpuk), $barang->count(), 0.9),
            'bukti_g06' => $this->paketBukti(
                'barang',
                sprintf('%d dari %d SKU tidak berputar selama ≥ %d hari.', count($menumpuk), $barang->count(), self::BATAS_TIDAK_BERPUTAR_HARI),
                $menumpuk
            ),
            'g07' => $barang->count() > 0 ? min(1.0, round($modalTerikat / max(1.0, $this->totalModalPersediaan($barang)), 4)) : 0.0,
            'bukti_g07' => $this->paketBukti(
                'barang',
                sprintf(
                    'Rp %s modal terikat pada %d SKU tidak berputar (%s%% dari nilai persediaan).',
                    number_format($modalTerikat, 0, ',', '.'),
                    count($menumpuk),
                    number_format(100 * $modalTerikat / max(1.0, $this->totalModalPersediaan($barang)), 1, ',', '.')
                ),
                $menumpuk
            ),
            'g04' => $this->hitungCf(count($seringHabis), $barang->count(), 0.8),
            'bukti_g04' => $this->paketBukti(
                'barang',
                sprintf('%d SKU bersisa ≤ 7 hari konsumsi pada pola jual saat ini.', count($seringHabis)),
                $seringHabis
            ),
            'g08' => $this->hitungCf(count($kedaluwarsa), $barang->count(), 0.85),
            'bukti_g08' => $this->paketBukti(
                'barang',
                sprintf('%d SKU mendekati/melewati kedaluwarsa atau berisiko masa simpan habis.', count($kedaluwarsa)),
                $kedaluwarsa
            ),
        ];
    }

    /**
     * Gejala transaksi: batal, pending/gagal, lebih bayar, omzet menurun,
     * dan produk terlaris kosong.
     *
     * @param  array<string, mixed>  $rentang
     * @return array<string, mixed>
     */
    protected function analisisTransaksi(array $rentang): array
    {
        $kosong = $this->kosong(['g02', 'g11', 'g12', 'g13', 'g14']);
        $kosong['total_transaksi'] = 0;

        if (! Schema::hasTable('transaksi')) {
            return $kosong;
        }

        $query = DB::table('transaksi');
        if ($rentang['awal']) {
            $query->whereDate('tanggal', '>=', $rentang['awal']);
        }
        if ($rentang['akhir']) {
            $query->whereDate('tanggal', '<=', $rentang['akhir']);
        }

        $transaksi = $query->get(['id_transaksi', 'no_transaksi', 'tanggal', 'status', 'metode_bayar', 'total_harga']);
        $total = $transaksi->count();

        if ($total === 0) {
            return $kosong;
        }

        // G02 - transaksi batal yang sudah menggeser stok.
        $batal = $transaksi->where('status', 'batal')->values();
        $detailBatal = $this->detailUntuk($batal->pluck('id_transaksi')->all());

        $buktiBatal = $batal->map(fn ($row) => [
            'kode' => $row->no_transaksi,
            'keterangan' => sprintf(
                '%s pada %s, %s item',
                $row->no_transaksi,
                Carbon::parse($row->tanggal)->toDateTimeString(),
                $detailBatal->where('id_transaksi', $row->id_transaksi)->count()
            ),
        ])->values()->all();

        // G13 - transaksi pending / belum selesai.
        $pending = $transaksi->where('status', 'pending')->values();

        // G14 - transaksi non-tunai bermasalah (pending/batal).
        $nonTunai = ['qris', 'transfer', 'debit', 'kredit'];
        $bermasalah = $transaksi->filter(
            fn ($row) => in_array($row->status, ['pending', 'batal'], true) && in_array($row->metode_bayar, $nonTunai, true)
        )->values();

        // G11 - omzet turun dibanding periode sebelumnya dengan panjang sama.
        $tren = $this->bandingOmzet($rentang);

        // G12 - produk terlaris periode sebelumnya kini kosong/menipis.
        $terlarisKosong = $this->produkTerlarisKosong($rentang);

        return [
            'g02' => $this->hitungCf($batal->count(), $total, 0.7),
            'bukti_g02' => $this->paketBukti(
                'transaksi',
                sprintf('%d transaksi batal dari %d transaksi pada %s.', $batal->count(), $total, $rentang['label']),
                $buktiBatal
            ),
            'g13' => $this->hitungCf($pending->count(), $total, 0.85),
            'bukti_g13' => $this->paketBukti(
                'transaksi',
                sprintf('%d transaksi pending dari %d pada %s.', $pending->count(), $total, $rentang['label']),
                $pending->map(fn ($row) => [
                    'kode' => $row->no_transaksi,
                    'keterangan' => sprintf(
                        '%s (%s) senilai Rp %s',
                        $row->no_transaksi,
                        $row->metode_bayar,
                        number_format((float) $row->total_harga, 0, ',', '.')
                    ),
                ])->all()
            ),
            'g14' => $this->hitungCf($bermasalah->count(), $total, 0.75),
            'bukti_g14' => $this->paketBukti(
                'transaksi',
                sprintf('%d transaksi non-tunai (QRIS/transfer/kartu) pending atau batal.', $bermasalah->count()),
                $bermasalah->map(fn ($row) => [
                    'kode' => $row->no_transaksi,
                    'keterangan' => sprintf('%s via %s — status %s', $row->no_transaksi, $row->metode_bayar, $row->status),
                ])->all()
            ),
            'g11' => $tren['cf'],
            'bukti_g11' => $this->paketBukti('transaksi', $tren['keterangan'], $tren['detail']),
            'g12' => $terlarisKosong['cf'],
            'bukti_g12' => $this->paketBukti('barang', $terlarisKosong['keterangan'], $terlarisKosong['detail']),
            'total_transaksi' => $total,
        ];
    }

    /**
     * Gejala harga & diskon: harga transaksi menyimpang dari katalog dan
     * diskon bertumpuk / kedaluwarsa.
     *
     * @return array<string, mixed>
     */
    protected function analisisHargaDiskon(): array
    {
        $hasil = $this->kosong(['g09', 'g10']);

        if (! Schema::hasTable('diskon')) {
            return $hasil;
        }

        $hariIni = Carbon::today();
        $diskon = DB::table('diskon')->get();

        // G10 - diskon aktif yang sudah lewat tanggal selesai, atau lebih dari satu aktif per barang.
        $kedaluwarsa = $diskon
            ->where('status', 'aktif')
            ->filter(fn ($row) => $row->tanggal_selesai && Carbon::parse($row->tanggal_selesai)->lt($hariIni))
            ->values();

        $bertumpuk = $diskon
            ->where('status', 'aktif')
            ->filter(fn ($row) => ! $row->tanggal_selesai || Carbon::parse($row->tanggal_selesai)->gte($hariIni))
            ->groupBy('id_barang')
            ->filter(fn (Collection $rows) => $rows->count() > 1);

        $detailDiskon = $kedaluwarsa->map(fn ($row) => [
            'kode' => $row->nama_diskon,
            'keterangan' => sprintf(
                'Aktif tetapi berakhir %s',
                $row->tanggal_selesai ? Carbon::parse($row->tanggal_selesai)->toDateString() : '-'
            ),
        ]);

        foreach ($bertumpuk as $rows) {
            $detailDiskon->push([
                'kode' => $rows->first()->nama_diskon,
                'keterangan' => sprintf('%d diskon aktif untuk barang #%d sekaligus', $rows->count(), $rows->first()->id_barang),
            ]);
        }

        $jumlahBermasalah = $kedaluwarsa->count() + $bertumpuk->count();
        $hasil['g10'] = $jumlahBermasalah > 0 ? min(1.0, 0.55 + (0.15 * $jumlahBermasalah)) : 0.0;
        $hasil['bukti_g10'] = $this->paketBukti(
            'diskon',
            $jumlahBermasalah > 0
                ? sprintf('%d diskon kedaluwarsa dan %d barang dengan diskon bertumpuk.', $kedaluwarsa->count(), $bertumpuk->count())
                : 'Semua diskon aktif masih berlaku dan tidak bertumpuk.',
            $detailDiskon->values()->all()
        );

        // G09 - harga satuan pada detail transaksi menyimpang dari katalog.
        $hasil['g09'] = 0.0;
        $hasil['bukti_g09'] = $this->paketBukti('transaksi', 'Belum ada penyimpangan harga yang terdeteksi.');

        if (! Schema::hasTable('detail_transaksi')) {
            return $hasil;
        }

        $menyimpang = DB::table('detail_transaksi')
            ->join('transaksi', 'detail_transaksi.id_transaksi', '=', 'transaksi.id_transaksi')
            ->join('barang', 'detail_transaksi.id_barang', '=', 'barang.id_barang')
            ->where('transaksi.status', 'selesai')
            ->whereRaw('ABS(detail_transaksi.harga_satuan - barang.harga_jual) > 0.01')
            ->select(
                'transaksi.no_transaksi',
                'barang.kode_barang',
                'barang.nama_barang',
                'detail_transaksi.harga_satuan',
                'barang.harga_jual'
            )
            ->orderByDesc('transaksi.tanggal')
            ->limit(20)
            ->get();

        if ($menyimpang->isNotEmpty()) {
            $hasil['g09'] = min(1.0, 0.5 + (0.1 * $menyimpang->count()));
            $hasil['bukti_g09'] = $this->paketBukti(
                'transaksi',
                sprintf('%d baris transaksi menggunakan harga berbeda dari katalog.', $menyimpang->count()),
                $menyimpang->map(fn ($row) => [
                    'kode' => $row->no_transaksi,
                    'keterangan' => sprintf(
                        '%s (%s) tercatat Rp %s, katalog Rp %s',
                        $row->kode_barang,
                        $row->nama_barang,
                        number_format((float) $row->harga_satuan, 0, ',', '.'),
                        number_format((float) $row->harga_jual, 0, ',', '.')
                    ),
                ])->all()
            );
        }

        return $hasil;
    }

    /**
     * Gejala kualitas data master: duplikasi dan data tidak lengkap.
     *
     * @return array<string, mixed>
     */
    protected function analisisDataMaster(): array
    {
        $hasil = $this->kosong(['g17', 'g18']);

        if (! Schema::hasTable('barang')) {
            return $hasil;
        }

        $barang = $this->ambilBarang();

        $duplikat = $barang
            ->groupBy(fn (Barang $row) => mb_strtolower(trim((string) $row->nama_barang)))
            ->filter(fn (Collection $rows) => $rows->count() > 1);

        $tidakLengkap = $barang->filter(
            fn (Barang $row) => (float) $row->harga_beli <= 0
                || (float) $row->harga_jual <= 0
                || blank($row->satuan)
                || (int) $row->stok_minimum <= 0
                || blank($row->id_kategori)
        );

        $hasil['g17'] = $this->hitungCf($duplikat->count(), $barang->count(), 0.8);
        $hasil['bukti_g17'] = $this->paketBukti(
            'barang',
            $duplikat->isNotEmpty()
                ? sprintf('%d nama barang muncul lebih dari sekali: %s.', $duplikat->count(), $duplikat->keys()->implode(', '))
                : 'Tidak ditemukan nama barang ganda.',
            $duplikat->map(fn (Collection $rows) => [
                'kode' => $rows->first()->kode_barang,
                'keterangan' => sprintf('%d SKU: %s', $rows->count(), $rows->pluck('kode_barang')->implode(', ')),
            ])->values()->all()
        );

        $hasil['g18'] = $this->hitungCf($tidakLengkap->count(), $barang->count(), 0.8);
        $hasil['bukti_g18'] = $this->paketBukti(
            'barang',
            sprintf('%d dari %d SKU memiliki harga/satuan/stok minimum yang belum lengkap.', $tidakLengkap->count(), $barang->count()),
            $tidakLengkap->map(fn (Barang $row) => $this->ringkasBarang($row, [
                'keterangan' => 'Harga beli/jual, satuan, kategori, atau stok minimum belum valid',
            ]))->values()->all()
        );

        return $hasil;
    }

    /**
     * Gejala audit stok (OAS): perubahan tanpa jejak dan jarang opname.
     *
     * @param  array<string, mixed>  $rentang
     * @return array<string, mixed>
     */
    protected function analisisAuditStok(array $rentang): array
    {
        $hasil = $this->kosong(['g19', 'g20']);

        if (! Schema::hasTable('stok_log')) {
            $hasil['bukti_g19'] = $this->paketBukti('tidak_tersedia', 'Tabel log stok tidak tersedia, perubahan stok tidak dapat diaudit.');
            $hasil['bukti_g20'] = $this->paketBukti('tidak_tersedia', 'Tabel log stok tidak tersedia, jadwal opname tidak dapat diverifikasi.');

            return $hasil;
        }

        $logs = DB::table('stok_log')->get(['id_barang', 'jenis', 'jumlah', 'stok_sebelum', 'stok_sesudah', 'referensi', 'keterangan', 'created_at']);
        $tanpaJejak = $logs->filter(function ($row) {
            if (in_array($row->jenis, ['penyesuaian'], true)) {
                return blank($row->referensi) || blank($row->keterangan);
            }

            return blank($row->referensi);
        })->values();

        $hasil['g19'] = $this->hitungCf($tanpaJejak->count(), max(1, $logs->count()), 0.85);
        $hasil['bukti_g19'] = $this->paketBukti(
            'stok_log',
            sprintf('%d dari %d entri log stok tanpa referensi/keterangan.', $tanpaJejak->count(), $logs->count()),
            $tanpaJejak->take(20)->map(fn ($row) => [
                'kode' => 'LOG-'.$row->jenis,
                'keterangan' => sprintf(
                    '%s %s pada barang #%d (%s) — referensi: %s',
                    ucfirst($row->jenis),
                    $row->jumlah,
                    $row->id_barang,
                    Carbon::parse($row->created_at)->toDateString(),
                    blank($row->referensi) ? 'tidak ada' : $row->referensi
                ),
            ])->all()
        );

        // G20 - jarak opname terakhir (penyesuaian dengan keterangan opname).
        $opnameTerakhir = $logs
            ->filter(fn ($row) => $row->jenis === 'penyesuaian')
            ->sortByDesc('created_at')
            ->first();

        $hariSejak = $opnameTerakhir
            ? Carbon::parse($opnameTerakhir->created_at)->diffInDays(Carbon::today())
            : null;

        // Tanpa riwayat log sama sekali, jadwal opname tidak dapat dinilai.
        $hasil['g20'] = match (true) {
            $logs->isEmpty() => 0.0,
            $hariSejak === null => 0.75,
            $hariSejak >= 90 => 1.0,
            $hariSejak >= 60 => 0.8,
            $hariSejak >= 30 => 0.5,
            default => 0.0,
        };

        $hasil['bukti_g20'] = $this->paketBukti(
            'stok_log',
            match (true) {
                $logs->isEmpty() => 'Log stok kosong, jadwal opname belum dapat dinilai.',
                $opnameTerakhir !== null => sprintf('Opname/penyesuaian terakhir %d hari lalu (%s).', (int) $hariSejak, Carbon::parse($opnameTerakhir->created_at)->toDateString()),
                default => 'Belum pernah ada penyesuaian stok opname tercatat.',
            },
            $opnameTerakhir ? [[
                'kode' => 'OPNAME',
                'keterangan' => sprintf('Terakhir pada %s: %s', Carbon::parse($opnameTerakhir->created_at)->toDateString(), $opnameTerakhir->keterangan ?: '-'),
            ]] : []
        );

        return $hasil;
    }

    /**
     * Bukti dari DSS: peringkat SAW live dipakai untuk memperkuat gejala
     * kebutuhan restok (G04) — bagian "DSS menilai ES".
     *
     * @return array<string, mixed>
     */
    protected function analisisDss(): array
    {
        $hasil = ['g04' => 0.0, 'bukti_g04' => $this->paketBukti('dss', 'DSS belum dapat dihitung (kriteria/alternatif belum tersedia).')];

        if (! Schema::hasTable('dss_kriteria') || ! Schema::hasTable('barang')) {
            return $hasil;
        }

        try {
            $data = app(DssDataService::class)->getAlternatif('all_time', 'relevan');
        } catch (\Throwable) {
            return $hasil;
        }

        $alternatif = $data['alternatif'] ?? [];
        $kriteria = $data['kriteria'] ?? [];

        if ($alternatif === [] || $kriteria === []) {
            return $hasil;
        }

        $bobot = collect($kriteria)->mapWithKeys(fn ($row) => [$row['kode_kriteria'] => (float) $row['bobot']]);
        $aktif = collect($alternatif)->filter(fn ($row) => (int) $row['stok'] <= (int) $row['stok_minimum'])->values();

        if ($aktif->isEmpty()) {
            return $hasil;
        }

        // Skor "risiko" sederhana: urgensi (C1) dengan bobot DSS apa adanya.
        $bobotC1 = max(0.0001, (float) ($bobot['C1'] ?? 0));
        $rataUrgensi = $aktif->avg(fn ($row) => (float) ($row['nilai']['C1'] ?? 0));
        $cf = min(0.9, round(($rataUrgensi / 100) * (0.5 + ($bobotC1 / 100)), 4));

        $hasil['g04'] = $cf;
        $hasil['bukti_g04'] = $this->paketBukti(
            'dss',
            sprintf(
                'DSS menandai %d barang kritis (stok ≤ minimum); rata-rata urgensi SAW %.1f dengan bobot C1 %s%%.',
                $aktif->count(),
                $rataUrgensi,
                rtrim(rtrim(number_format($bobotC1, 2, ',', '.'), '0'), ',')
            ),
            $aktif->map(fn ($row) => [
                'kode' => $row['kode_barang'],
                'keterangan' => sprintf(
                    '%s: stok %d %s / minimum %d — urgensi %.1f',
                    $row['nama_alternatif'],
                    $row['stok'],
                    $row['satuan'],
                    $row['stok_minimum'],
                    $row['nilai']['C1'] ?? 0
                ),
            ])->all()
        );

        return $hasil;
    }

    /**
     * Status integrasi sumber data yang dipakai ES.
     *
     * @param  array<string, mixed>  $rentang
     * @return array<int, array<string, mixed>>
     */
    public function statusSumber(array $rentang): array
    {
        $tps = [
            'transaksi' => $this->tableInfo('transaksi', 'tanggal'),
            'detail_transaksi' => $this->tableInfo('detail_transaksi'),
            'barang' => $this->tableInfo('barang', 'updated_at'),
        ];
        $oas = [
            'stok_log' => $this->tableInfo('stok_log', 'created_at'),
            'rekomendasi_restock' => $this->tableInfo('rekomendasi_restock', 'created_at'),
        ];
        $kms = ['knowledge_base' => $this->tableInfo('knowledge_base', 'updated_at')];
        $mis = ['laporan_manajemen' => $this->tableInfo('laporan_manajemen', 'created_at')];
        $dss = [
            'dss_kriteria' => $this->tableInfo('dss_kriteria'),
            'dss_analisis' => $this->tableInfo('dss_analisis', 'created_at'),
        ];

        return [
            $this->barisSumber('TPS', 'Transaction Processing System', $tps, 'Stok, harga, penjualan & transaksi pending/batal'),
            $this->barisSumber('OAS', 'Office Automation System', $oas, 'Audit stok & disposisi restok'),
            $this->barisSumber('KMS', 'Knowledge Management System', $kms, 'SOP penanganan untuk rujukan solusi'),
            $this->barisSumber('MIS', 'Management Information System', $mis, 'Konteks laporan manajerial'),
            $this->barisSumber('DSS', 'Decision Support System', $dss, 'Peringkat SAW sebagai bukti tambahan'),
        ];
    }

    /**
     * @param  array<string, array{ada: bool, jumlah: int, terakhir: ?string}>  $tabel
     * @return array<string, mixed>
     */
    protected function barisSumber(string $modul, string $nama, array $tabel, string $dipakai): array
    {
        $ada = count(array_filter($tabel, fn ($t) => $t['ada']));
        $berisi = count(array_filter($tabel, fn ($t) => $t['ada'] && $t['jumlah'] > 0));

        $status = match (true) {
            $ada === 0 => 'tidak_tersedia',
            $berisi === 0 => 'kosong',
            $berisi < count($tabel) => 'sebagian',
            default => 'terhubung',
        };

        $waktu = array_filter(array_column($tabel, 'terakhir'));
        $jumlah = array_sum(array_column($tabel, 'jumlah'));

        return [
            'modul' => $modul,
            'nama' => $nama,
            'status' => $status,
            'tabel' => array_keys($tabel),
            'jumlah_record' => $jumlah,
            'terakhir_update' => empty($waktu) ? null : max($waktu),
            'dipakai_untuk' => $dipakai,
        ];
    }

    /**
     * Derajat keyakinan dari proporsi temuan.
     *
     * CF = (proporsi^0.5) × maksimum, dengan temuan tunggal yang pasti
     * (proporsi = 1) langsung bernilai maksimum.
     */
    protected function hitungCf(int $jumlah, int $total, float $maksimum): float
    {
        if ($jumlah <= 0 || $total <= 0) {
            return 0.0;
        }

        $proporsi = min(1.0, $jumlah / $total);

        return round(sqrt($proporsi) * $maksimum, 4);
    }

    /**
     * @param  array<int, array<string, mixed>>  $detail
     * @return array<string, mixed>
     */
    protected function paketBukti(string $sumber, string $ringkasan, array $detail = []): array
    {
        return [
            'sumber' => $sumber,
            'ringkasan' => $ringkasan,
            'jumlah' => count($detail),
            'detail' => array_values($detail),
        ];
    }

    /**
     * @param  array<int, string>  $kunci
     * @return array<string, mixed>
     */
    protected function kosong(array $kunci): array
    {
        $hasil = [];
        foreach ($kunci as $kode) {
            $hasil[$kode] = 0.0;
            $hasil['bukti_'.$kode] = $this->paketBukti('tidak_tersedia', 'Data sumber belum tersedia.');
        }

        return $hasil;
    }

    /**
     * @return Collection<int, Barang>
     */
    protected function ambilBarang(): Collection
    {
        return Barang::query()
            ->select(['id_barang', 'kode_barang', 'id_kategori', 'nama_barang', 'deskripsi', 'harga_beli', 'harga_jual', 'stok', 'stok_minimum', 'satuan', 'created_at'])
            ->orderBy('id_barang')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $tambahan
     * @return array<string, mixed>
     */
    protected function ringkasBarang(object $row, array $tambahan = []): array
    {
        return array_merge([
            'kode' => $row->kode_barang,
            'nama' => $row->nama_barang,
            'stok' => (int) $row->stok,
            'stok_minimum' => (int) $row->stok_minimum,
            'satuan' => $row->satuan,
        ], $tambahan);
    }

    protected function totalModalPersediaan(Collection $barang): float
    {
        return max(1.0, (float) $barang->sum(fn (Barang $row) => (int) $row->stok * (float) $row->harga_beli));
    }

    protected function hitungBarang(): int
    {
        return Schema::hasTable('barang') ? Barang::count() : 0;
    }

    /**
     * @param  array<string, mixed>  $rentang
     * @return Collection<int, object>
     */
    protected function agregatPenjualan(array $rentang): Collection
    {
        if (! Schema::hasTable('detail_transaksi')) {
            return collect();
        }

        $query = DB::table('detail_transaksi')
            ->join('transaksi', 'detail_transaksi.id_transaksi', '=', 'transaksi.id_transaksi')
            ->where('transaksi.status', 'selesai')
            ->select(
                'detail_transaksi.id_barang',
                DB::raw('SUM(detail_transaksi.jumlah) as total_terjual'),
                DB::raw('SUM(detail_transaksi.subtotal) as total_pendapatan')
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
     * @return array<int, string>
     */
    protected function tanggalTerakhirPenjualan(): array
    {
        if (! Schema::hasTable('detail_transaksi')) {
            return [];
        }

        return DB::table('detail_transaksi')
            ->join('transaksi', 'detail_transaksi.id_transaksi', '=', 'transaksi.id_transaksi')
            ->where('transaksi.status', 'selesai')
            ->select('detail_transaksi.id_barang', DB::raw('MAX(transaksi.tanggal) as terakhir'))
            ->groupBy('detail_transaksi.id_barang')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->id_barang => $row->terakhir])
            ->all();
    }

    protected function hariEfektif(array $rentang): int
    {
        if ($rentang['hari'] > 0) {
            return $rentang['hari'];
        }

        if (! Schema::hasTable('transaksi')) {
            return 1;
        }

        $range = DB::table('transaksi')->where('status', 'selesai')
            ->selectRaw('MIN(tanggal) as pertama, MAX(tanggal) as terakhir')
            ->first();

        if (! $range || ! $range->pertama || ! $range->terakhir) {
            return 1;
        }

        return max(1, (int) Carbon::parse($range->pertama)->diffInDays(Carbon::parse($range->terakhir)) + 1);
    }

    /**
     * Bandingkan omzet periode dengan periode sebelumnya yang sama panjang.
     *
     * @param  array<string, mixed>  $rentang
     * @return array{cf: float, keterangan: string, detail: array<int, array<string, mixed>>}
     */
    protected function bandingOmzet(array $rentang): array
    {
        $kosong = ['cf' => 0.0, 'keterangan' => 'Data omzet pembanding belum tersedia.', 'detail' => []];

        if (! Schema::hasTable('transaksi')) {
            return $kosong;
        }

        $hari = $rentang['hari'] > 0 ? $rentang['hari'] : 30;

        if ($rentang['awal']) {
            $awalSekarang = Carbon::parse($rentang['awal']);
            $akhirSekarang = Carbon::parse($rentang['akhir']);
        } else {
            $akhirSekarang = Carbon::today();
            $awalSekarang = $akhirSekarang->copy()->subDays($hari - 1);
        }

        $awalSebelum = $awalSekarang->copy()->subDays($hari);
        $akhirSebelum = $awalSekarang->copy()->subDay();

        $sum = function ($a, $b) {
            return (float) DB::table('transaksi')
                ->where('status', 'selesai')
                ->whereDate('tanggal', '>=', $a->toDateString())
                ->whereDate('tanggal', '<=', $b->toDateString())
                ->sum('total_harga');
        };

        $sekarang = $sum($awalSekarang, $akhirSekarang);
        $sebelum = $sum($awalSebelum, $akhirSebelum);

        if ($sebelum <= 0) {
            return array_merge($kosong, [
                'keterangan' => sprintf(
                    'Omzet Rp %s pada periode ini, namun periode sebelumnya tidak memiliki transaksi selesai.',
                    number_format($sekarang, 0, ',', '.')
                ),
            ]);
        }

        $perubahan = (($sekarang - $sebelum) / $sebelum) * 100;

        if ($perubahan > -self::BATAS_PENURUNAN_PERSEN) {
            return [
                'cf' => 0.0,
                'keterangan' => sprintf(
                    'Omzet bergerak %s%% (Rp %s → Rp %s), belum melewati batas penurunan %d%%.',
                    number_format($perubahan, 1, ',', '.'),
                    number_format($sebelum, 0, ',', '.'),
                    number_format($sekarang, 0, ',', '.'),
                    self::BATAS_PENURUNAN_PERSEN
                ),
                'detail' => [],
            ];
        }

        // Maksimum CF tercapai pada penurunan 60% atau lebih.
        $cf = min(1.0, round(abs($perubahan) / 60, 4));

        return [
            'cf' => $cf,
            'keterangan' => sprintf(
                'Omzet turun %s%% (Rp %s → Rp %s) dibanding %s s.d. %s.',
                number_format(abs($perubahan), 1, ',', '.'),
                number_format($sebelum, 0, ',', '.'),
                number_format($sekarang, 0, ',', '.'),
                $awalSebelum->toDateString(),
                $akhirSebelum->toDateString()
            ),
            'detail' => [[
                'kode' => $awalSekarang->toDateString().' s.d. '.$akhirSekarang->toDateString(),
                'keterangan' => sprintf('Omzet Rp %s vs periode sebelumnya Rp %s', number_format($sekarang, 0, ',', '.'), number_format($sebelum, 0, ',', '.')),
            ]],
        ];
    }

    /**
     * Produk terlaris periode sebelumnya yang kini kosong atau menipis.
     *
     * @param  array<string, mixed>  $rentang
     * @return array{cf: float, keterangan: string, detail: array<int, array<string, mixed>>}
     */
    protected function produkTerlarisKosong(array $rentang): array
    {
        $kosong = ['cf' => 0.0, 'keterangan' => 'Tidak ada produk terlaris yang kosong.', 'detail' => []];

        if (! Schema::hasTable('detail_transaksi') || ! Schema::hasTable('barang')) {
            return $kosong;
        }

        $hari = $rentang['hari'] > 0 ? $rentang['hari'] : 30;
        $akhir = $rentang['akhir'] ? Carbon::parse($rentang['akhir']) : Carbon::today();
        $awal = $akhir->copy()->subDays($hari - 1);

        $terlaris = DB::table('detail_transaksi')
            ->join('transaksi', 'detail_transaksi.id_transaksi', '=', 'transaksi.id_transaksi')
            ->where('transaksi.status', 'selesai')
            ->whereDate('transaksi.tanggal', '>=', $awal->toDateString())
            ->whereDate('transaksi.tanggal', '<=', $akhir->toDateString())
            ->select('detail_transaksi.id_barang', DB::raw('SUM(detail_transaksi.jumlah) as total'))
            ->groupBy('detail_transaksi.id_barang')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        if ($terlaris->isEmpty()) {
            return $kosong;
        }

        $stok = Barang::whereIn('id_barang', $terlaris->pluck('id_barang'))
            ->get(['id_barang', 'kode_barang', 'nama_barang', 'stok', 'stok_minimum', 'satuan'])
            ->keyBy('id_barang');

        $detail = $terlaris->filter(function ($row) use ($stok) {
            $b = $stok->get($row->id_barang);

            return $b && (int) $b->stok <= max(1, (int) $b->stok_minimum);
        })->map(function ($row) use ($stok) {
            $b = $stok->get($row->id_barang);

            return [
                'kode' => $b->kode_barang,
                'keterangan' => sprintf(
                    '%s: terjual %d, stok kini %d %s (minimum %d)',
                    $b->nama_barang,
                    $row->total,
                    $b->stok,
                    $b->satuan,
                    $b->stok_minimum
                ),
            ];
        })->values()->all();

        $jumlah = count($detail);

        return [
            'cf' => $this->hitungCf($jumlah, $terlaris->count(), 0.8),
            'keterangan' => $jumlah > 0
                ? sprintf('%d dari %d produk terlaris kini kosong/menipis.', $jumlah, $terlaris->count())
                : 'Semua produk terlaris masih memiliki stok cukup.',
            'detail' => $detail,
        ];
    }

    protected function cariTanggalKedaluwarsa(object $row): ?Carbon
    {
        $teks = trim(($row->nama_barang ?? '').' '.($row->deskripsi ?? ''));

        if ($teks === '') {
            return null;
        }

        if (preg_match('/\b(\d{4})-(\d{2})-(\d{2})\b/', $teks, $m)) {
            return Carbon::createFromFormat('Y-m-d', "{$m[1]}-{$m[2]}-{$m[3]}") ?: null;
        }

        return null;
    }

    /**
     * @param  array<int, int>  $idTransaksi
     */
    protected function detailUntuk(array $idTransaksi): Collection
    {
        if ($idTransaksi === [] || ! Schema::hasTable('detail_transaksi')) {
            return collect();
        }

        return DB::table('detail_transaksi')->whereIn('id_transaksi', $idTransaksi)->get();
    }

    /**
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
}
