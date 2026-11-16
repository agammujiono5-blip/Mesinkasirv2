<?php

namespace App\Services;

/**
 * Mesin inferensi Expert System (forward chaining + Certainty Factor).
 *
 * Kelas ini murni komputasi (tidak menyentuh database) sehingga mudah diuji
 * dan dapat dipakai ulang oleh endpoint diagnose maupun preview basis aturan.
 *
 * Kombinasi CF untuk hipotesis H:
 * - CF pertama  : CF(H, e1) = CF(pakar) x CF(pengguna)
 * - CF gabungan : CF(H, e1 ∧ e2) = CF1 + CF2 x (1 - CF1)
 *
 * Gejala dapat berasal dari dua sumber:
 * - "otomatis" : dinilai dari data TPS/OAS/KMS/DSS (bukti sistem)
 * - "manual"   : dikonfirmasi pengguna lewat checklist
 *
 * Saat kedua sumber aktif untuk gejala yang sama, nilai pengguna menjadi
 * koreksi atas taksiran sistem (FIELDS: sistem 0,8 lalu dikoreksi 0,5 => 0,5).
 */
class EsInferenceService
{
    /** Ambang batas terendah agar hipotesis dianggap teridentifikasi. */
    public const AMBANG_MINIMAL = 0.35;

    /** Asal bukti yang dikenali mesin inferensi. */
    public const ASAL_OTOMATIS = 'otomatis';

    public const ASAL_MANUAL = 'manual';

    /**
     * Jalankan forward chaining atas gejala (sudah dinilai CF pengguna).
     *
     * @param  array<int, array<string, mixed>>  $rule  daftar rule aktif: [kode_rule, kode_kerusakan, kode_gejala, cf_pakar]
     * @param  array<string, float>  $cfPengguna  [kode_gejala => CF pengguna 0..1]
     * @param  array<string, string>  $asal  [kode_gejala => sumber bukti]
     * @return array{
     *     kandidat: array<int, array<string, mixed>>,
     *     terdeteksi: array<int, array<string, mixed>>,
     *     utama: array<string, mixed>|null,
     *     langkah: array<int, string>,
     *     total_rule_aktif: int,
     *     total_rule_terpicu: int
     * }
     */
    public function inferensi(array $rule, array $cfPengguna, array $asal = []): array
    {
        $langkah = [];
        $akumulasi = [];
        $ruleTerpicu = 0;

        $jumlahOtomatis = count(array_filter(array_keys($cfPengguna), fn (string $kode) => ($asal[$kode] ?? self::ASAL_MANUAL) === self::ASAL_OTOMATIS));

        $langkah[] = sprintf(
            'Input dikonversi menjadi %d gejala dengan derajat keyakinan pengguna (CF pengguna)%s.',
            count($cfPengguna),
            $jumlahOtomatis > 0
                ? sprintf('; %d di antaranya dinilai otomatis dari data TPS/OAS/KMS/DSS', $jumlahOtomatis)
                : ''
        );

        foreach ($rule as $item) {
            $kodeKerusakan = $item['kode_kerusakan'] ?? null;
            $kodeGejala = $item['kode_gejala'] ?? null;

            if ($kodeKerusakan === null || $kodeGejala === null) {
                continue;
            }

            $cfPakar = (float) ($item['cf_pakar'] ?? 0);
            $cfUser = (float) ($cfPengguna[$kodeGejala] ?? 0);

            // Gejala tidak dipilih / dikonfirmasi kosong => rule tidak terpicu.
            if ($cfPakar <= 0 || $cfUser <= 0) {
                continue;
            }

            $ruleTerpicu++;
            $cfRule = round($cfPakar * $cfUser, 4);

            if (! isset($akumulasi[$kodeKerusakan])) {
                $akumulasi[$kodeKerusakan] = [
                    'cf' => $cfRule,
                    'gejala_cocok' => [],
                    'rule' => [],
                ];
            } else {
                $cfLama = $akumulasi[$kodeKerusakan]['cf'];
                $cfBaru = $cfLama + ($cfRule * (1 - $cfLama));
                $akumulasi[$kodeKerusakan]['cf'] = round($cfBaru, 4);
            }

            $akumulasi[$kodeKerusakan]['gejala_cocok'][] = $kodeGejala;
            $akumulasi[$kodeKerusakan]['rule'][] = [
                'kode_rule' => $item['kode_rule'] ?? null,
                'kode_gejala' => $kodeGejala,
                'cf_pakar' => $cfPakar,
                'cf_pengguna' => $cfUser,
                'cf_rule' => $cfRule,
                'cf_kumulatif' => $akumulasi[$kodeKerusakan]['cf'],
                'asal' => $asal[$kodeGejala] ?? self::ASAL_MANUAL,
            ];

            $langkah[] = sprintf(
                'R%s: IF %s%s THEN %s → CF %s × %s = %s (CF kumulatif %s).',
                $item['kode_rule'] ?? '-',
                $kodeGejala,
                ($asal[$kodeGejala] ?? self::ASAL_MANUAL) === self::ASAL_OTOMATIS ? ' [otomatis dari data]' : '',
                $kodeKerusakan,
                $this->formatAngka($cfPakar),
                $this->formatAngka($cfUser),
                $this->formatAngka($cfRule),
                $this->formatAngka($akumulasi[$kodeKerusakan]['cf'])
            );
        }

        $langkah[] = sprintf(
            '%d dari %d rule aktif terpicu oleh gejala yang dipilih.',
            $ruleTerpicu,
            count($rule)
        );

        $kandidat = [];
        foreach ($akumulasi as $kodeKerusakan => $data) {
            $kandidat[] = [
                'kode_kerusakan' => $kodeKerusakan,
                'cf' => $data['cf'],
                'persentase' => $this->formatAngka($data['cf'] * 100).'%',
                'persen' => round($data['cf'] * 100, 2),
                'gejala_cocok' => $data['gejala_cocok'],
                'jumlah_gejala_cocok' => count($data['gejala_cocok']),
                'rule' => $data['rule'],
                'tingkat_keyakinan' => $this->levelKeyakinan($data['cf']),
                'teridentifikasi' => $data['cf'] >= self::AMBANG_MINIMAL,
            ];
        }

        usort($kandidat, function (array $a, array $b): int {
            if ($a['cf'] === $b['cf']) {
                return strcmp($a['kode_kerusakan'], $b['kode_kerusakan']);
            }

            return $b['cf'] <=> $a['cf'];
        });

        $terdeteksi = array_values(array_filter($kandidat, fn (array $row) => $row['teridentifikasi']));
        $utama = $terdeteksi[0] ?? null;

        $langkah[] = $utama === null
            ? sprintf(
                'Tidak ada hipotesis yang mencapai ambang keyakinan minimal %s%%. Tambahkan gejala yang relevan.',
                (int) round(self::AMBANG_MINIMAL * 100)
            )
            : sprintf(
                'Hipotesis terkuat: %s dengan nilai CF %s (%s).',
                $utama['kode_kerusakan'],
                $this->formatAngka($utama['cf']),
                $utama['persentase']
            );

        return [
            'kandidat' => $kandidat,
            'terdeteksi' => $terdeteksi,
            'utama' => $utama,
            'langkah' => $langkah,
            'total_rule_aktif' => count($rule),
            'total_rule_terpicu' => $ruleTerpicu,
        ];
    }

    /**
     * Gabungkan bukti otomatis dengan input pengguna.
     *
     * Aturan:
     * - Gejala hanya dari data       => dipakai nilai otomatis.
     * - Gejala juga dikonfirmasi user => nilai pengguna menjadi koreksi.
     * - Gejala hanya dari pengguna   => tetap manual (belum ada bukti sistem).
     *
     * @param  array<string, float>  $cfOtomatis  [kode_gejala => CF hasil penilaian data]
     * @param  array<string, float>  $cfPengguna  [kode_gejala => CF input pengguna]
     * @return array{gejala: array<string, float>, asal: array<string, string>}
     */
    public function gabungkanBukti(array $cfOtomatis, array $cfPengguna): array
    {
        $gejala = [];
        $asal = [];

        foreach ($cfOtomatis as $kode => $nilai) {
            $gejala[$kode] = $nilai;
            $asal[$kode] = self::ASAL_OTOMATIS;
        }

        foreach ($cfPengguna as $kode => $nilai) {
            $gejala[$kode] = $nilai;
            $asal[$kode] = self::ASAL_MANUAL;
        }

        return [
            'gejala' => $gejala,
            'asal' => $asal,
        ];
    }

    /**
     * Klasifikasi tingkat keyakinan dari nilai CF akhir.
     */
    public function levelKeyakinan(float $cf): string
    {
        return match (true) {
            $cf >= 0.85 => 'sangat yakin',
            $cf >= 0.70 => 'yakin',
            $cf >= self::AMBANG_MINIMAL => 'cukup yakin',
            $cf > 0 => 'kurang yakin',
            default => 'tidak diketahui',
        };
    }

    /**
     * Normalisasi pilihan gejala: [kode => cf] maupun [kode, kode, ...].
     *
     * Gejala tanpa nilai dianggap dipilih penuh (CF pengguna = 1.0) karena
     * mekanisme utama UI adalah checklist gejala yang dialami.
     *
     * @return array<string, float>
     */
    public function normalisasiCfPengguna(array $input): array
    {
        $hasil = [];

        foreach ($input as $key => $value) {
            if (is_array($value) && isset($value['kode_gejala'])) {
                $kode = (string) $value['kode_gejala'];
                $nilai = $value['cf'] ?? 1.0;
            } elseif (is_string($key) && is_numeric($value)) {
                $kode = $key;
                $nilai = $value;
            } else {
                $kode = (string) $value;
                $nilai = 1.0;
            }

            $kode = trim($kode);

            if ($kode === '') {
                continue;
            }

            $cf = (float) $nilai;
            $cf = max(0.0, min(1.0, $cf));

            if ($cf <= 0) {
                continue;
            }

            // Jika kode muncul lebih dari sekali, ambil keyakinan tertinggi.
            $hasil[$kode] = max($hasil[$kode] ?? 0.0, $cf);
        }

        return $hasil;
    }

    protected function formatAngka(float $nilai): string
    {
        return rtrim(rtrim(number_format($nilai, 4, ',', '.'), '0'), ',');
    }
}
