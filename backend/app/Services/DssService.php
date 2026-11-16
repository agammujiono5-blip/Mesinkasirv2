<?php

namespace App\Services;

use App\Models\DssAnalisis;
use App\Models\DssHasilAlternatif;
use App\Models\DssKriteria;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Orkestrator modul DSS: menggabungkan data TPS/OAS/KMS/MIS dengan mesin SAW,
 * menyimpan riwayat analisis, dan menyiapkan data dashboard.
 */
class DssService
{
    public function __construct(
        protected DssDataService $dataService,
        protected SawService $sawService,
        protected ExpertSystemService $expertSystemService,
    ) {}

    /**
     * Data dashboard DSS: status sumber data, kriteria, ringkasan hasil live, riwayat.
     *
     * @return array<string, mixed>
     */
    public function getDashboard(string $periode = 'all_time'): array
    {
        $kriteria = $this->dataService->getKriteria();
        $sumber = $this->dataService->getSumberData();
        $live = $this->hitungLive($periode);

        $riwayat = $this->getRiwayat(5);
        $terakhir = $riwayat[0] ?? null;

        return [
            'metode' => 'SAW',
            'metode_label' => 'Simple Additive Weighting',
            'periode' => $live['periode'],
            'daftar_periode' => collect(DssDataService::PERIODE)
                ->map(fn ($label, $kode) => ['kode' => $kode, 'label' => $label])
                ->values()
                ->all(),
            'kriteria' => $kriteria,
            'sumber_data' => $sumber,
            'status_integrasi' => $this->ringkasStatusIntegrasi($sumber),
            'konteks_es' => $this->konteksEs(),
            'ringkasan' => array_merge($live['ringkasan'], [
                'total_alternatif' => $live['ringkasan']['total_alternatif'] ?? 0,
                'total_kriteria' => count($kriteria),
                'total_analisis_tersimpan' => $this->hitungAnalisis(),
            ]),
            'peringkat' => $live['hasil'] ?? [],
            'normalisasi' => $live['normalisasi'] ?? [],
            'rekomendasi_utama' => $this->rekomendasiUtama($live['hasil'] ?? [], $kriteria, $live['periode'] ?? []),
            'peringatan' => $live['peringatan'] ?? [],
            'riwayat_terakhir' => $terakhir,
            'riwayat' => $riwayat,
        ];
    }

    /**
     * Hitung peringkat live memakai bobot aktif tersimpan (tanpa menyimpan riwayat).
     *
     * @return array<string, mixed>
     */
    public function hitungLive(string $periode = 'all_time'): array
    {
        $kriteria = $this->dataService->getKriteria();
        $bobot = array_column($kriteria, 'bobot', 'kode_kriteria');
        $data = $this->dataService->getAlternatif($periode, 'relevan', $this->konteksEs());

        if (empty($kriteria)) {
            return [
                'periode' => $data['periode'],
                'kriteria' => [],
                'bobot' => [],
                'hasil' => [],
                'normalisasi' => [],
                'ringkasan' => [
                    'total_alternatif' => 0,
                    'total_kriteria' => 0,
                    'skor_tertinggi' => 0.0,
                    'skor_terendah' => 0.0,
                ],
                'peringatan' => ['Kriteria DSS belum tersedia. Jalankan seeder DssKriteriaSeeder.'],
            ];
        }

        $hitung = $this->sawService->hitung($kriteria, $data['alternatif'], $bobot);

        return array_merge($hitung, [
            'periode' => $data['periode'],
            'hasil' => $this->lengkapiRekomendasi($hitung['hasil'], $hitung['kriteria'], $data, []),
            'peringatan' => array_values(array_unique(array_merge($data['peringatan'], $hitung['peringatan']))),
        ]);
    }

    /**
     * Jalankan analisis SAW lalu simpan sebagai riwayat.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function analyze(array $input, ?User $user = null): array
    {
        $periode = $input['periode'] ?? 'all_time';
        $judul = $input['judul'] ?? null;
        $catatan = $input['catatan'] ?? null;

        $kriteria = $this->dataService->getKriteria();

        $bobotInput = $this->normalisasiBobotInput($input, $kriteria);
        $validasi = $this->sawService->validateBobot($kriteria, $bobotInput);

        $data = $this->dataService->getAlternatif($periode, 'relevan', $this->konteksEs());

        if (empty($data['alternatif'])) {
            throw ValidationException::withMessages([
                'alternatif' => array_merge(
                    ['Tidak ada alternatif yang dapat dianalisis pada periode ini.'],
                    $data['peringatan']
                ),
            ]);
        }

        $hitung = $this->sawService->hitung($validasi['kriteria'], $data['alternatif'], $validasi['bobot']);
        $hasil = $this->lengkapiRekomendasi($hitung['hasil'], $validasi['kriteria'], $data, $input);

        $analisis = DB::transaction(function () use ($judul, $periode, $data, $validasi, $hasil, $hitung, $user, $catatan) {
            $analisis = DssAnalisis::create([
                'kode_analisis' => $this->generateKodeAnalisis(),
                'judul' => $judul ?: 'Analisis Prioritas Restok Barang',
                'metode' => 'SAW',
                'periode' => $periode,
                'periode_awal' => $data['periode']['awal'] ?? null,
                'periode_akhir' => $data['periode']['akhir'] ?? null,
                'total_alternatif' => count($hasil),
                'total_kriteria' => count($validasi['kriteria']),
                'kriteria_json' => $this->snapshotKriteria($validasi['kriteria'], $validasi['bobot']),
                'bobot_json' => $validasi['bobot'],
                'sumber_data_json' => [
                    'periode' => $data['periode'],
                    'sumber' => $this->dataService->getSumberData(),
                    'peringatan' => array_values(array_unique(array_merge($data['peringatan'], $hitung['peringatan']))),
                    'nilai_max' => $hitung['ringkasan']['nilai_max'] ?? [],
                    'nilai_min' => $hitung['ringkasan']['nilai_min'] ?? [],
                ],
                'alternatif_terbaik' => $hasil[0]['nama_alternatif'] ?? null,
                'skor_tertinggi' => $hasil[0]['skor'] ?? 0,
                'status' => 'selesai',
                'catatan' => $catatan,
                'id_user' => $user?->id_user,
            ]);

            foreach ($hasil as $row) {
                DssHasilAlternatif::create([
                    'id_analisis' => $analisis->id_analisis,
                    'id_barang' => $row['id_barang'],
                    'kode_alternatif' => $row['kode_alternatif'],
                    'nama_alternatif' => $row['nama_alternatif'],
                    'nilai_json' => $row['nilai'],
                    'normalisasi_json' => $row['normalisasi'],
                    'skor' => $row['skor'],
                    'peringkat' => $row['peringkat'],
                    'rekomendasi' => $row['rekomendasi'],
                ]);
            }

            return $analisis->fresh(['hasil']);
        });

        return $this->formatAnalisis($analisis, $hitung, $data);
    }

    /**
     * Simulasi bobot tanpa menyimpan riwayat.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function simulate(array $input): array
    {
        $periode = $input['periode'] ?? 'all_time';
        $kriteria = $this->dataService->getKriteria();
        $bobotInput = $this->normalisasiBobotInput($input, $kriteria);
        $validasi = $this->sawService->validateBobot($kriteria, $bobotInput);

        $data = $this->dataService->getAlternatif($periode, 'relevan', $this->konteksEs());

        if (empty($data['alternatif'])) {
            throw ValidationException::withMessages([
                'alternatif' => array_merge(
                    ['Tidak ada alternatif yang dapat disimulasikan pada periode ini.'],
                    $data['peringatan']
                ),
            ]);
        }

        $hitung = $this->sawService->hitung($validasi['kriteria'], $data['alternatif'], $validasi['bobot']);
        $hasil = $this->lengkapiRekomendasi($hitung['hasil'], $validasi['kriteria'], $data, $input);

        return [
            'disimulasikan' => true,
            'disimpan' => false,
            'periode' => $data['periode'],
            'kriteria' => $hitung['kriteria'],
            'bobot' => $validasi['bobot'],
            'hasil' => $hasil,
            'normalisasi' => $hitung['normalisasi'],
            'ringkasan' => $hitung['ringkasan'],
            'rekomendasi_utama' => $this->rekomendasiUtama($hasil, $validasi['kriteria'], $data['periode']),
            'peringatan' => array_values(array_unique(array_merge($data['peringatan'], $hitung['peringatan']))),
        ];
    }

    /**
     * Daftar riwayat analisis.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getRiwayat(int $limit = 20): array
    {
        if (! Schema::hasTable('dss_analisis')) {
            return [];
        }

        return DssAnalisis::with('user:id_user,nama,role')
            ->orderByDesc('id_analisis')
            ->limit($limit)
            ->get()
            ->map(fn (DssAnalisis $row) => [
                'id_analisis' => $row->id_analisis,
                'kode_analisis' => $row->kode_analisis,
                'judul' => $row->judul,
                'metode' => $row->metode,
                'periode' => $row->periode,
                'periode_awal' => $row->periode_awal?->toDateString(),
                'periode_akhir' => $row->periode_akhir?->toDateString(),
                'total_alternatif' => $row->total_alternatif,
                'total_kriteria' => $row->total_kriteria,
                'alternatif_terbaik' => $row->alternatif_terbaik,
                'skor_tertinggi' => $row->skor_tertinggi,
                'status' => $row->status,
                'catatan' => $row->catatan,
                'dianalisis_oleh' => $row->user?->nama,
                'dibuat_pada' => $row->created_at?->toDateTimeString(),
            ])
            ->all();
    }

    /**
     * Detail satu riwayat analisis lengkap dengan bobot, skor, dan peringkat.
     *
     * @return array<string, mixed>
     */
    public function getDetailRiwayat(int $id): array
    {
        $analisis = DssAnalisis::with(['hasil', 'user:id_user,nama,role'])->find($id);

        if (! $analisis) {
            throw ValidationException::withMessages([
                'id' => ['Riwayat analisis DSS tidak ditemukan.'],
            ]);
        }

        return [
            'id_analisis' => $analisis->id_analisis,
            'kode_analisis' => $analisis->kode_analisis,
            'judul' => $analisis->judul,
            'metode' => $analisis->metode,
            'periode' => $analisis->periode,
            'periode_awal' => $analisis->periode_awal?->toDateString(),
            'periode_akhir' => $analisis->periode_akhir?->toDateString(),
            'total_alternatif' => $analisis->total_alternatif,
            'total_kriteria' => $analisis->total_kriteria,
            'kriteria' => $analisis->kriteria_json ?? [],
            'bobot' => $analisis->bobot_json ?? [],
            'sumber_data' => $analisis->sumber_data_json['sumber'] ?? [],
            'peringatan' => $analisis->sumber_data_json['peringatan'] ?? [],
            'nilai_max' => $analisis->sumber_data_json['nilai_max'] ?? [],
            'nilai_min' => $analisis->sumber_data_json['nilai_min'] ?? [],
            'alternatif_terbaik' => $analisis->alternatif_terbaik,
            'skor_tertinggi' => $analisis->skor_tertinggi,
            'status' => $analisis->status,
            'catatan' => $analisis->catatan,
            'dianalisis_oleh' => $analisis->user?->nama,
            'dibuat_pada' => $analisis->created_at?->toDateTimeString(),
            'hasil' => $analisis->hasil->map(fn (DssHasilAlternatif $row) => [
                'kode_alternatif' => $row->kode_alternatif,
                'nama_alternatif' => $row->nama_alternatif,
                'id_barang' => $row->id_barang,
                'nilai' => $row->nilai_json,
                'normalisasi' => $row->normalisasi_json,
                'skor' => $row->skor,
                'peringkat' => $row->peringkat,
                'rekomendasi' => $row->rekomendasi,
            ])->values()->all(),
        ];
    }

    /**
     * Daftar alternatif + nilai kriteria (read-only, tanpa perhitungan skor).
     *
     * @return array<string, mixed>
     */
    public function getAlternatif(string $periode = 'all_time', string $scope = 'relevan'): array
    {
        return $this->dataService->getAlternatif($periode, $scope);
    }

    /**
     * Ambil / perbarui bobot kriteria aktif.
     *
     * @param  array<string, mixed>|null  $bobot
     * @return array<int, array<string, mixed>>
     */
    public function getKriteria(?array $bobot = null): array
    {
        $kriteria = $this->dataService->getKriteria();

        if ($bobot === null) {
            return $kriteria;
        }

        $validasi = $this->sawService->validateBobot($kriteria, $bobot);

        return array_map(function ($item) use ($validasi) {
            $item['bobot'] = $validasi['bobot'][$item['kode_kriteria']] ?? 0;

            return $item;
        }, $kriteria);
    }

    /**
     * Simpan bobot kriteria baru (dipakai sebagai default analisis berikutnya).
     *
     * @param  array<string, mixed>  $bobot
     * @return array<int, array<string, mixed>>
     */
    public function simpanBobot(array $bobot): array
    {
        $kriteria = $this->dataService->getKriteria();
        $validasi = $this->sawService->validateBobot($kriteria, $bobot);

        DB::transaction(function () use ($validasi) {
            foreach ($validasi['bobot'] as $kode => $nilai) {
                DssKriteria::where('kode_kriteria', $kode)->update(['bobot' => $nilai]);
            }
        });

        return $this->dataService->getKriteria();
    }

    /**
     * Normalisasi input bobot: menerima format map {C1: 35} maupun array [{kode_kriteria, bobot}].
     *
     * @param  array<string, mixed>  $input
     * @param  array<int, array<string, mixed>>  $kriteria
     * @return array<string, float>
     */
    protected function normalisasiBobotInput(array $input, array $kriteria): array
    {
        $raw = $input['bobot'] ?? null;

        if (is_array($raw)) {
            // Format array of objects.
            if (array_is_list($raw)) {
                $map = [];
                foreach ($raw as $item) {
                    if (is_array($item) && isset($item['kode_kriteria'])) {
                        $map[$item['kode_kriteria']] = $item['bobot'] ?? null;
                    }
                }

                return $map;
            }

            return $raw;
        }

        // Fallback: gunakan bobot tersimpan di database.
        return array_column($kriteria, 'bobot', 'kode_kriteria');
    }

    /**
     * Tambahkan kalimat rekomendasi & penjelasan tiap alternatif.
     *
     * @param  array<int, array<string, mixed>>  $hasil
     * @param  array<int, array<string, mixed>>  $kriteria
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $input
     * @return array<int, array<string, mixed>>
     */
    protected function lengkapiRekomendasi(array $hasil, array $kriteria, array $data, array $input): array
    {
        $konteks = [
            'sumber' => 'TPS (transaksi & stok), OAS (disposisi restok), KMS (SOP), MIS (laporan manajemen)',
            'periode_label' => $data['periode']['label'] ?? 'periode terpilih',
        ];

        $detailBarang = collect($data['alternatif'])->keyBy('kode_alternatif');

        return array_map(function ($row) use ($kriteria, $konteks, $detailBarang) {
            $row['rekomendasi'] = $this->sawService->buatRekomendasi($row, $kriteria, $konteks);
            $info = $detailBarang->get($row['kode_alternatif']);

            if ($info) {
                $row['kode_barang'] = $info['kode_barang'] ?? null;
                $row['kategori'] = $info['kategori'] ?? null;
                $row['supplier'] = $info['supplier'] ?? null;
                $row['stok'] = $info['stok'] ?? null;
                $row['stok_minimum'] = $info['stok_minimum'] ?? null;
                $row['satuan'] = $info['satuan'] ?? null;
                $row['terjual'] = $info['terjual'] ?? null;
                $row['jumlah_disarankan'] = $info['jumlah_disarankan'] ?? null;
                $row['estimasi_biaya'] = $info['nilai']['C3'] ?? null;
                $row['status_restock'] = $info['status_restock'] ?? null;
                $row['es_menandai'] = $info['es_menandai'] ?? false;
                $row['diagnosa_es'] = $info['diagnosa_es'] ?? null;
                $row['dasar_nilai'] = $info['dasar_nilai'] ?? [];

                if ($row['es_menandai'] && isset($row['rekomendasi']) && $row['diagnosa_es']) {
                    $row['rekomendasi'] .= sprintf(
                        ' Expert System (%s, %s) menandai SKU ini sebagai barang terdampak.',
                        $row['diagnosa_es']['kode_kerusakan'] ?? '-',
                        $row['diagnosa_es']['persentase'] ?? '-'
                    );
                }
            }

            return $row;
        }, $hasil);
    }

    /**
     * @param  array<int, array<string, mixed>>  $hasil
     * @param  array<int, array<string, mixed>>  $kriteria
     * @param  array<string, mixed>  $periode
     * @return array<string, mixed>|null
     */
    protected function rekomendasiUtama(array $hasil, array $kriteria, array $periode): ?array
    {
        if (empty($hasil)) {
            return null;
        }

        $teratas = $hasil[0];

        return [
            'kode_alternatif' => $teratas['kode_alternatif'] ?? null,
            'nama_alternatif' => $teratas['nama_alternatif'] ?? null,
            'kode_barang' => $teratas['kode_barang'] ?? null,
            'skor' => $teratas['skor'] ?? 0,
            'peringkat' => $teratas['peringkat'] ?? 1,
            'alasan' => $teratas['rekomendasi'] ?? null,
            'dasar_nilai' => $teratas['dasar_nilai'] ?? [],
            'estimasi_biaya' => $teratas['estimasi_biaya'] ?? null,
            'jumlah_disarankan' => $teratas['jumlah_disarankan'] ?? null,
            'satuan' => $teratas['satuan'] ?? null,
            'periode' => $periode['label'] ?? null,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $kriteria
     * @param  array<string, float>  $bobot
     * @return array<int, array<string, mixed>>
     */
    protected function snapshotKriteria(array $kriteria, array $bobot): array
    {
        return array_map(fn ($k) => [
            'kode_kriteria' => $k['kode_kriteria'],
            'nama_kriteria' => $k['nama_kriteria'],
            'jenis' => $k['jenis'],
            'satuan' => $k['satuan'],
            'bobot' => $bobot[$k['kode_kriteria']] ?? 0,
        ], $kriteria);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatAnalisis(DssAnalisis $analisis, array $hitung, array $data): array
    {
        return [
            'id_analisis' => $analisis->id_analisis,
            'kode_analisis' => $analisis->kode_analisis,
            'judul' => $analisis->judul,
            'metode' => $analisis->metode,
            'periode' => $data['periode'],
            'kriteria' => $hitung['kriteria'],
            'bobot' => $analisis->bobot_json,
            'normalisasi' => $hitung['normalisasi'],
            'hasil' => $analisis->hasil->map(fn (DssHasilAlternatif $row) => [
                'kode_alternatif' => $row->kode_alternatif,
                'nama_alternatif' => $row->nama_alternatif,
                'id_barang' => $row->id_barang,
                'nilai' => $row->nilai_json,
                'normalisasi' => $row->normalisasi_json,
                'skor' => $row->skor,
                'peringkat' => $row->peringkat,
                'rekomendasi' => $row->rekomendasi,
            ])->values()->all(),
            'ringkasan' => $hitung['ringkasan'],
            'rekomendasi_utama' => $this->rekomendasiUtama(
                $analisis->hasil->map(fn ($row) => [
                    'kode_alternatif' => $row->kode_alternatif,
                    'nama_alternatif' => $row->nama_alternatif,
                    'skor' => $row->skor,
                    'peringkat' => $row->peringkat,
                    'rekomendasi' => $row->rekomendasi,
                    'nilai' => $row->nilai_json,
                ])->values()->all(),
                $hitung['kriteria'],
                $data['periode']
            ),
            'peringatan' => array_values(array_unique(array_merge($data['peringatan'], $hitung['peringatan']))),
            'disimpan_pada' => $analisis->created_at?->toDateTimeString(),
        ];
    }

    /**
     * Konteks Expert System untuk DSS — hanya membaca diagnosa ES yang SUDAH
     * tersimpan (tidak memicu perhitungan ES), sehingga alur pemicu tetap satu
     * arah: data → ES, lalu DSS membaca hasil ES.
     *
     * @return array<string, mixed>|null
     */
    public function konteksEs(): ?array
    {
        $diagnosa = $this->expertSystemService->getDiagnosaTerbaru();

        if ($diagnosa === null) {
            return [
                'tersedia' => false,
                'keterangan' => 'Belum ada diagnosa Expert System tersimpan. Jalankan diagnosa ES agar DSS dapat memakai konteksnya.',
            ];
        }

        return array_merge($diagnosa, [
            'tersedia' => true,
            'keterangan' => 'DSS memakai diagnosa ES terakhir sebagai konteks tambahan; skor SAW tetap dihitung dari TPS/OAS/KMS/MIS.',
        ]);
    }

    protected function ringkasStatusIntegrasi(array $sumber): array
    {
        $terhubung = count(array_filter($sumber, fn ($s) => $s['status'] === 'terhubung'));

        return [
            'total_modul' => count($sumber),
            'terhubung' => $terhubung,
            'persentase' => count($sumber) > 0 ? (int) round(($terhubung / count($sumber)) * 100) : 0,
            'semua_terhubung' => $terhubung === count($sumber),
        ];
    }

    protected function hitungAnalisis(): int
    {
        return Schema::hasTable('dss_analisis') ? DssAnalisis::count() : 0;
    }

    protected function generateKodeAnalisis(): string
    {
        $prefix = 'DSS-'.Carbon::now()->format('Ymd').'-';
        $terakhir = DssAnalisis::where('kode_analisis', 'like', $prefix.'%')
            ->orderByDesc('id_analisis')
            ->value('kode_analisis');

        $urut = $terakhir ? ((int) substr($terakhir, -4)) + 1 : 1;

        return $prefix.str_pad((string) $urut, 4, '0', STR_PAD_LEFT);
    }
}
