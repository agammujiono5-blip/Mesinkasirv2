<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\EsDiagnosa;
use App\Models\EsGejala;
use App\Models\EsKerusakan;
use App\Models\EsRule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Orkestrator Expert System: menyediakan basis pengetahuan, menjalankan
 * forward chaining + Certainty Factor, lalu menyimpan riwayat diagnosa.
 */
class ExpertSystemService
{
    public function __construct(
        protected EsInferenceService $inferenceService,
        protected EsDataService $dataService,
    ) {}

    /** Urutan kategori yang ditampilkan di UI. */
    public const KATEGORI = [
        'stok' => 'Stok & Inventori',
        'penjualan' => 'Penjualan',
        'pembayaran' => 'Pembayaran',
        'opname' => 'Stok Opname',
        'umum' => 'Umum',
    ];

    /**
     * Ringkasan dashboard Expert System.
     *
     * @return array<string, mixed>
     */
    public function getDashboard(string $periode = '90_hari'): array
    {
        $ringkasan = $this->ringkasan();
        $riwayat = $this->getRiwayat(5);
        $otomatis = $this->dataService->nilaiGejala($periode);

        return [
            'metode' => 'Forward Chaining + Certainty Factor',
            'metode_label' => 'Sistem Pakar Berbasis Aturan',
            'basis_pengetahuan' => $ringkasan,
            'kategori' => collect(self::KATEGORI)
                ->map(fn (string $label, string $kode) => ['kode' => $kode, 'label' => $label])
                ->values()
                ->all(),
            'sumber_data' => $otomatis['sumber_data'],
            'deteksi_otomatis' => [
                'periode' => $otomatis['periode'],
                'daftar_periode' => $otomatis['daftar_periode'],
                'ringkasan' => $otomatis['ringkasan'],
                'gejala' => collect($otomatis['gejala'])
                    ->map(fn (float $cf, string $kode) => [
                        'kode_gejala' => $kode,
                        'cf' => $cf,
                        'persentase' => round($cf * 100, 1),
                        'bukti' => $otomatis['bukti'][$kode] ?? null,
                    ])
                    ->sortKeys()
                    ->values()
                    ->all(),
            ],
            'diagnosa_terakhir' => $riwayat[0] ?? null,
            'riwayat' => $riwayat,
            'ambang_keyakinan_persen' => (int) round(EsInferenceService::AMBANG_MINIMAL * 100),
        ];
    }

    /**
     * Ringkasan jumlah entitas basis pengetahuan.
     *
     * @return array<string, mixed>
     */
    public function ringkasan(): array
    {
        if (! $this->tabelTersedia()) {
            return [
                'total_kerusakan' => 0,
                'total_gejala' => 0,
                'total_rule' => 0,
                'total_diagnosa' => 0,
                'per_kategori' => [],
                'siap' => false,
                'peringatan' => ['Tabel Expert System belum tersedia. Jalankan migration lalu EsBasisPengetahuanSeeder.'],
            ];
        }

        $kerusakan = EsKerusakan::where('aktif', true)->get();
        $totalDiagnosa = Schema::hasTable('es_diagnosa') ? EsDiagnosa::count() : 0;

        return [
            'total_kerusakan' => $kerusakan->count(),
            'total_gejala' => EsGejala::where('aktif', true)->count(),
            'total_rule' => EsRule::where('aktif', true)->count(),
            'total_diagnosa' => $totalDiagnosa,
            'per_kategori' => $kerusakan
                ->groupBy('kategori')
                ->map(fn ($items, $kode) => [
                    'kode' => $kode,
                    'label' => self::KATEGORI[$kode] ?? ucfirst((string) $kode),
                    'jumlah' => $items->count(),
                ])
                ->values()
                ->all(),
            'siap' => $kerusakan->isNotEmpty() && EsRule::where('aktif', true)->exists(),
            'peringatan' => [],
        ];
    }

    /**
     * Daftar gejala aktif, dikelompokkan berdasarkan kategori kelompok.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getGejala(?string $kodeKerusakan = null): array
    {
        if (! $this->tabelTersedia()) {
            return [];
        }

        $query = EsGejala::where('aktif', true);

        if ($kodeKerusakan !== null && $kodeKerusakan !== '') {
            $query->whereIn('kode_gejala', EsRule::where('kode_kerusakan', $kodeKerusakan)
                ->where('aktif', true)
                ->pluck('kode_gejala'));
        }

        return $query->orderBy('urutan')
            ->orderBy('kode_gejala')
            ->get()
            ->map(fn (EsGejala $row) => [
                'id_gejala' => $row->id_gejala,
                'kode_gejala' => $row->kode_gejala,
                'nama_gejala' => $row->nama_gejala,
                'kelompok' => $row->kelompok,
                'deskripsi' => $row->deskripsi,
                'urutan' => $row->urutan,
            ])
            ->all();
    }

    /**
     * Daftar hipotesis (kerusakan/kondisi) beserta rule IF-THEN-nya.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getKerusakan(?string $kategori = null): array
    {
        if (! $this->tabelTersedia()) {
            return [];
        }

        $query = EsKerusakan::where('aktif', true)
            ->with(['rules' => fn ($q) => $q->where('aktif', true)->with('gejala')->orderBy('kode_rule')]);

        if ($kategori !== null && $kategori !== '') {
            $query->where('kategori', $kategori);
        }

        return $query->orderBy('kode_kerusakan')
            ->get()
            ->map(fn (EsKerusakan $row) => [
                'id_kerusakan' => $row->id_kerusakan,
                'kode_kerusakan' => $row->kode_kerusakan,
                'nama_kerusakan' => $row->nama_kerusakan,
                'kategori' => $row->kategori,
                'kategori_label' => self::KATEGORI[$row->kategori] ?? ucfirst((string) $row->kategori),
                'deskripsi' => $row->deskripsi,
                'solusi' => $row->solusi,
                'tingkat_urgensi' => $row->tingkat_urgensi,
                'jumlah_rule' => $row->rules->count(),
                'rule' => $row->rules->map(fn (EsRule $rule) => [
                    'kode_rule' => $rule->kode_rule,
                    'kode_gejala' => $rule->kode_gejala,
                    'nama_gejala' => $rule->gejala?->nama_gejala,
                    'cf_pakar' => $rule->cf_pakar,
                ])->values()->all(),
            ])
            ->all();
    }

    /**
     * Bentuk teks IF-THEN tiap rule untuk halaman basis pengetahuan.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAturan(): array
    {
        if (! $this->tabelTersedia()) {
            return [];
        }

        return EsRule::where('aktif', true)
            ->with(['gejala', 'kerusakan'])
            ->orderBy('kode_kerusakan')
            ->orderBy('kode_rule')
            ->get()
            ->map(fn (EsRule $row) => [
                'kode_rule' => $row->kode_rule,
                'kode_gejala' => $row->kode_gejala,
                'nama_gejala' => $row->gejala?->nama_gejala,
                'kode_kerusakan' => $row->kode_kerusakan,
                'nama_kerusakan' => $row->kerusakan?->nama_kerusakan,
                'cf_pakar' => $row->cf_pakar,
                'pernyataan' => sprintf(
                    'IF %s (%s) THEN %s [CF %s]',
                    $row->kode_gejala,
                    $row->gejala?->nama_gejala ?? '-',
                    $row->kode_kerusakan,
                    $row->cf_pakar
                ),
            ])
            ->all();
    }

    /**
     * Jalankan diagnosa tanpa menyimpan (preview).
     *
     * Bukti otomatis dari TPS/OAS/KMS/MIS/DSS menyusun gejala awal; gejala yang
     * dikonfirmasi pengguna menjadi koreksi atas taksiran sistem. Bila
     * `otomatis` = false, diagnosa hanya memakai input manual.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function diagnose(array $input, bool $simpan = true, ?User $user = null): array
    {
        if (! $this->tabelTersedia()) {
            throw ValidationException::withMessages([
                'basis_pengetahuan' => ['Tabel Expert System belum tersedia. Jalankan migration dan seeder basis pengetahuan.'],
            ]);
        }

        $gejalaInput = $input['gejala'] ?? [];
        $cfPengguna = $this->inferenceService->normalisasiCfPengguna(is_array($gejalaInput) ? $gejalaInput : []);

        $pakaiOtomatis = (bool) ($input['otomatis'] ?? true);
        $periode = (string) ($input['periode'] ?? '90_hari');
        $otomatis = $pakaiOtomatis ? $this->dataService->nilaiGejala($periode) : null;

        $kodeGejalaValid = EsGejala::where('aktif', true)->pluck('kode_gejala')->all();
        $tidakDikenal = array_values(array_diff(array_keys($cfPengguna), $kodeGejalaValid));

        if ($tidakDikenal !== []) {
            throw ValidationException::withMessages([
                'gejala' => ['Kode gejala tidak dikenal: '.implode(', ', $tidakDikenal).'.'],
            ]);
        }

        $buktiSistem = $otomatis['gejala'] ?? [];
        $gabungan = $this->inferenceService->gabungkanBukti($buktiSistem, $cfPengguna);

        if ($gabungan['gejala'] === []) {
            throw ValidationException::withMessages([
                'gejala' => ['Tidak ada gejala terdeteksi maupun dipilih. Pilih minimal satu gejala yang dialami.'],
            ]);
        }

        $cfFinal = $gabungan['gejala'];
        $asal = $gabungan['asal'];

        $rule = EsRule::where('aktif', true)
            ->orderBy('kode_kerusakan')
            ->orderBy('kode_rule')
            ->get(['kode_rule', 'kode_kerusakan', 'kode_gejala', 'cf_pakar'])
            ->map(fn (EsRule $row) => [
                'kode_rule' => $row->kode_rule,
                'kode_kerusakan' => $row->kode_kerusakan,
                'kode_gejala' => $row->kode_gejala,
                'cf_pakar' => $row->cf_pakar,
            ])
            ->all();

        if ($rule === []) {
            throw ValidationException::withMessages([
                'basis_pengetahuan' => ['Belum ada rule aktif. Jalankan EsBasisPengetahuanSeeder.'],
            ]);
        }

        $hasil = $this->inferenceService->inferensi($rule, $cfFinal, $asal);
        $kerusakanMap = EsKerusakan::where('aktif', true)->get()->keyBy('kode_kerusakan');
        $gejalaMap = EsGejala::where('aktif', true)->get()->keyBy('kode_gejala');

        $kandidat = array_map(function (array $row) use ($kerusakanMap, $gejalaMap, $otomatis) {
            $info = $kerusakanMap->get($row['kode_kerusakan']);

            // Data pendukung konkret (SKU/transaksi/kriteria) dari gejala yang terpicu.
            $dataPendukung = collect($row['rule'])
                ->filter(fn (array $r) => ($r['asal'] ?? '') === EsInferenceService::ASAL_OTOMATIS)
                ->map(fn (array $r) => [
                    'kode_gejala' => $r['kode_gejala'],
                    'nama_gejala' => $gejalaMap->get($r['kode_gejala'])?->nama_gejala,
                    'cf_otomatis' => $r['cf_pengguna'],
                    'bukti' => $otomatis['bukti'][$r['kode_gejala']] ?? null,
                ])
                ->values()
                ->all();

            return array_merge($row, [
                'nama_kerusakan' => $info?->nama_kerusakan,
                'kategori' => $info?->kategori,
                'kategori_label' => $info ? (self::KATEGORI[$info->kategori] ?? ucfirst((string) $info->kategori)) : null,
                'deskripsi' => $info?->deskripsi,
                'solusi' => $info?->solusi,
                'tingkat_urgensi' => $info?->tingkat_urgensi,
                'gejala' => collect($row['gejala_cocok'])
                    ->map(fn (string $kode) => [
                        'kode_gejala' => $kode,
                        'nama_gejala' => $gejalaMap->get($kode)?->nama_gejala,
                        'asal' => $asal[$kode] ?? EsInferenceService::ASAL_MANUAL,
                        'cf' => $cfFinal[$kode] ?? 0,
                    ])
                    ->values()
                    ->all(),
                'data_pendukung' => $dataPendukung,
                'jumlah_data_pendukung' => count($dataPendukung),
            ]);
        }, $hasil['kandidat']);

        // Solusi berisi rujukan SOP dari KMS bila artikel relevan tersedia.
        foreach ($kandidat as &$row) {
            $row['rujukan_knowledge'] = $this->cariRujukanKnowledge($row['kode_kerusakan'], $row['kategori'] ?? null);
        }
        unset($row);

        $utama = $kandidat[0] ?? null;
        $teridentifikasi = $utama !== null && $utama['teridentifikasi'];

        $hasilFinal = [
            'metode' => 'Forward Chaining + Certainty Factor',
            'ambang_keyakinan_persen' => (int) round(EsInferenceService::AMBANG_MINIMAL * 100),
            'otomatis_aktif' => $pakaiOtomatis,
            'periode' => $otomatis['periode'] ?? null,
            'gejala_otomatis' => collect($buktiSistem)
                ->map(fn (float $cf, string $kode) => [
                    'kode_gejala' => $kode,
                    'nama_gejala' => $gejalaMap->get($kode)?->nama_gejala,
                    'cf_otomatis' => $cf,
                    'persentase' => round($cf * 100, 2),
                    'dikoreksi' => array_key_exists($kode, $cfPengguna),
                    'cf_final' => $cfFinal[$kode] ?? 0,
                ])
                ->values()
                ->all(),
            'gejala_terpilih' => collect($cfFinal)
                ->map(fn (float $cf, string $kode) => [
                    'kode_gejala' => $kode,
                    'nama_gejala' => $gejalaMap->get($kode)?->nama_gejala,
                    'cf_pengguna' => $cf,
                    'asal' => $asal[$kode] ?? EsInferenceService::ASAL_MANUAL,
                    'persentase' => round($cf * 100, 2),
                    'bukti' => ($asal[$kode] ?? null) === EsInferenceService::ASAL_OTOMATIS
                        ? ($otomatis['bukti'][$kode] ?? null)
                        : null,
                ])
                ->values()
                ->all(),
            'sumber_data' => $otomatis['sumber_data'] ?? [],
            'total_rule_aktif' => $hasil['total_rule_aktif'],
            'total_rule_terpicu' => $hasil['total_rule_terpicu'],
            'hasil' => $teridentifikasi ? 'teridentifikasi' : 'tidak_teridentifikasi',
            'utama' => $utama,
            'kandidat' => $kandidat,
            'langkah_inferensi' => $hasil['langkah'],
        ];

        if (! $simpan) {
            $hasilFinal['disimpan'] = false;

            return $hasilFinal;
        }

        $diagnosa = DB::transaction(function () use ($utama, $hasil, $kandidat, $hasilFinal, $input, $user) {
            $record = EsDiagnosa::create([
                'kode_diagnosa' => $this->generateKodeDiagnosa(),
                'kode_kerusakan' => $utama['kode_kerusakan'] ?? null,
                'kategori' => $utama['kategori'] ?? null,
                'cf_akhir' => $utama['cf'] ?? 0,
                'persentase' => $utama['persentase'] ?? '0%',
                'tingkat_keyakinan' => $utama['tingkat_keyakinan'] ?? 'tidak diketahui',
                'hasil' => $hasilFinal['hasil'],
                'gejala_json' => array_map(
                    fn (array $row) => [
                        'kode_gejala' => $row['kode_gejala'],
                        'cf_pengguna' => $row['cf_pengguna'],
                        'asal' => $row['asal'],
                    ],
                    $hasilFinal['gejala_terpilih']
                ),
                'kerusakan_teridentifikasi_json' => array_map(
                    fn (array $row) => $row['kode_kerusakan'],
                    array_values(array_filter($kandidat, fn (array $row) => $row['teridentifikasi']))
                ),
                'kandidat_json' => $kandidat,
                'langkah_inferensi_json' => $hasil['langkah'],
                'catatan' => $input['catatan'] ?? null,
                'id_user' => $user?->id_user,
            ]);

            return $record->fresh(['kerusakan', 'user:id_user,nama,role']);
        });

        $hasilFinal['disimpan'] = true;
        $hasilFinal['id_diagnosa'] = $diagnosa->id_diagnosa;
        $hasilFinal['kode_diagnosa'] = $diagnosa->kode_diagnosa;
        $hasilFinal['didiagnosa_pada'] = $diagnosa->created_at?->toDateTimeString();
        $hasilFinal['didiagnosa_oleh'] = $diagnosa->user?->nama;

        return $hasilFinal;
    }

    /**
     * Riwayat diagnosa.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getRiwayat(int $limit = 20): array
    {
        if (! $this->tabelTersedia() || ! Schema::hasTable('es_diagnosa')) {
            return [];
        }

        return EsDiagnosa::with(['kerusakan:id_kerusakan,kode_kerusakan,nama_kerusakan,tingkat_urgensi', 'user:id_user,nama,role'])
            ->orderByDesc('id_diagnosa')
            ->limit($limit)
            ->get()
            ->map(fn (EsDiagnosa $row) => $this->formatDiagnosa($row))
            ->all();
    }

    /**
     * Detail satu riwayat diagnosa lengkap dengan langkah inferensi.
     *
     * @return array<string, mixed>
     */
    public function getDetailRiwayat(int $id): array
    {
        $row = EsDiagnosa::with(['kerusakan', 'user:id_user,nama,role'])->find($id);

        if (! $row) {
            throw ValidationException::withMessages([
                'id' => ['Riwayat diagnosa tidak ditemukan.'],
            ]);
        }

        return array_merge($this->formatDiagnosa($row), [
            'gejala_terpilih' => $row->gejala_json ?? [],
            'kandidat' => $row->kandidat_json ?? [],
            'kandidat_teridentifikasi' => $row->kerusakan_teridentifikasi_json ?? [],
            'langkah_inferensi' => $row->langkah_inferensi_json ?? [],
            'solusi' => $row->kerusakan?->solusi,
            'deskripsi' => $row->kerusakan?->deskripsi,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatDiagnosa(EsDiagnosa $row): array
    {
        return [
            'id_diagnosa' => $row->id_diagnosa,
            'kode_diagnosa' => $row->kode_diagnosa,
            'kode_kerusakan' => $row->kode_kerusakan,
            'nama_kerusakan' => $row->kerusakan?->nama_kerusakan,
            'tingkat_urgensi' => $row->kerusakan?->tingkat_urgensi,
            'kategori' => $row->kategori,
            'kategori_label' => $row->kategori ? (self::KATEGORI[$row->kategori] ?? ucfirst((string) $row->kategori)) : null,
            'cf_akhir' => $row->cf_akhir,
            'persentase' => $row->persentase,
            'tingkat_keyakinan' => $row->tingkat_keyakinan,
            'hasil' => $row->hasil,
            'jumlah_gejala' => is_array($row->gejala_json) ? count($row->gejala_json) : 0,
            'catatan' => $row->catatan,
            'didiagnosa_oleh' => $row->user?->nama,
            'dibuat_pada' => $row->created_at?->toDateTimeString(),
        ];
    }

    /**
     * Diagnosa ES terakhir yang tersimpan (dipakai DSS sebagai konteks).
     *
     * @return array<string, mixed>|null
     */
    public function getDiagnosaTerbaru(): ?array
    {
        if (! $this->tabelTersedia() || ! Schema::hasTable('es_diagnosa')) {
            return null;
        }

        $row = EsDiagnosa::with('kerusakan:id_kerusakan,kode_kerusakan,nama_kerusakan,tingkat_urgensi')
            ->orderByDesc('id_diagnosa')
            ->first();

        if (! $row) {
            return null;
        }

        $kandidat = is_array($row->kandidat_json) ? $row->kandidat_json : [];
        $utama = $row->kode_kerusakan ? collect($kandidat)->firstWhere('kode_kerusakan', $row->kode_kerusakan) : null;

        // Hanya kode barang yang benar-benar ada (bukan nomor transaksi/log).
        $kodeBarang = collect($utama['data_pendukung'] ?? [])
            ->flatMap(fn (array $dp) => $dp['bukti']['detail'] ?? [])
            ->pluck('kode')
            ->filter()
            ->unique()
            ->values();

        $valid = Schema::hasTable('barang')
            ? Barang::whereIn('kode_barang', $kodeBarang)->pluck('kode_barang')->all()
            : [];

        return [
            'id_diagnosa' => $row->id_diagnosa,
            'kode_diagnosa' => $row->kode_diagnosa,
            'kode_kerusakan' => $row->kode_kerusakan,
            'nama_kerusakan' => $row->kerusakan?->nama_kerusakan,
            'tingkat_urgensi' => $row->kerusakan?->tingkat_urgensi,
            'kategori' => $row->kategori,
            'cf_akhir' => $row->cf_akhir,
            'persentase' => $row->persentase,
            'tingkat_keyakinan' => $row->tingkat_keyakinan,
            'hasil' => $row->hasil,
            'dibuat_pada' => $row->created_at?->toDateTimeString(),
            // SKU yang disebut sebagai data pendukung diagnosa ini.
            'barang_terdampak' => $valid,
        ];
    }

    /**
     * Artikel knowledge_base (KMS) yang relevan dengan hipotesis.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function cariRujukanKnowledge(string $kodeKerusakan, ?string $kategori): array
    {
        if (! Schema::hasTable('knowledge_base')) {
            return [];
        }

        $kerusakan = EsKerusakan::where('kode_kerusakan', $kodeKerusakan)->first();
        $kataKunci = $this->kataKunciKnowledge($kodeKerusakan, $kategori, $kerusakan?->nama_kerusakan);

        return DB::table('knowledge_base')
            ->select('id_knowledge', 'judul', 'kategori', 'isi')
            ->orderBy('id_knowledge')
            ->get()
            ->map(function ($row) use ($kataKunci) {
                $teks = mb_strtolower($row->judul.' '.$row->isi);
                $cocok = collect($kataKunci)->filter(fn (string $k) => str_contains($teks, $k))->values()->all();
                $row->cocok = $cocok;

                return $row;
            })
            ->filter(fn ($row) => $row->cocok !== [])
            ->sortByDesc(fn ($row) => count($row->cocok))
            ->take(3)
            ->map(fn ($row) => [
                'id_knowledge' => $row->id_knowledge,
                'judul' => $row->judul,
                'kategori' => $row->kategori,
                'ringkasan' => Str::limit(trim(strip_tags($row->isi)), 180),
                'kata_kunci_cocok' => $row->cocok,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    protected function kataKunciKnowledge(string $kodeKerusakan, ?string $kategori, ?string $nama): array
    {
        $perKode = [
            'K01' => ['opname', 'selisih stok', 'stok fisik'],
            'K02' => ['restok', 'stok minimum', 'stockout', 'kehabisan'],
            'K03' => ['slow moving', 'overstock', 'menumpuk', 'bundling'],
            'K04' => ['diskon', 'harga'],
            'K05' => ['omzet', 'penjualan'],
            'K06' => ['transaksi', 'qris', 'pembayaran', 'pending'],
            'K07' => ['kas', 'kasir', 'shift'],
            'K08' => ['data barang', 'duplikat', 'kode barang'],
            'K09' => ['audit', 'log stok'],
            'K10' => ['kedaluwarsa', 'fifo', 'masa simpan'],
        ];

        $kataKunci = $perKode[$kodeKerusakan] ?? [];

        if ($kategori !== null) {
            $kataKunci[] = $kategori;
        }

        if ($nama) {
            foreach (preg_split('/[^a-z0-9]+/i', mb_strtolower($nama)) as $kata) {
                if (mb_strlen($kata) >= 5) {
                    $kataKunci[] = $kata;
                }
            }
        }

        return array_values(array_unique(array_map('mb_strtolower', $kataKunci)));
    }

    protected function generateKodeDiagnosa(): string
    {
        $prefix = 'ES-'.Carbon::now()->format('Ymd').'-';
        $terakhir = EsDiagnosa::where('kode_diagnosa', 'like', $prefix.'%')
            ->orderByDesc('id_diagnosa')
            ->value('kode_diagnosa');

        $urut = $terakhir ? ((int) substr($terakhir, -4)) + 1 : 1;

        return $prefix.str_pad((string) $urut, 4, '0', STR_PAD_LEFT);
    }

    protected function tabelTersedia(): bool
    {
        return Schema::hasTable('es_kerusakan')
            && Schema::hasTable('es_gejala')
            && Schema::hasTable('es_rule');
    }
}
