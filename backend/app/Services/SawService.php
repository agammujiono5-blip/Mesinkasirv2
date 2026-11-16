<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

/**
 * Mesin perhitungan SAW (Simple Additive Weighting).
 *
 * Kelas ini murni komputasi (tidak menyentuh database) sehingga mudah diuji
 * dan dapat dipakai ulang oleh endpoint analyze maupun simulate.
 */
class SawService
{
    /** Toleransi pembulatan total bobot (dalam persen). */
    public const TOLERANSI_BOBOT = 0.01;

    /**
     * Validasi & normalisasi bobot kriteria.
     *
     * Aturan:
     * - Setiap kriteria aktif wajib memiliki bobot numerik.
     * - Bobot tidak boleh negatif dan tidak boleh melebihi 100.
     * - Total bobot harus 100 (toleransi 0.01) agar perbandingan antar alternatif adil.
     * - Minimal dua kriteria memiliki bobot > 0.
     *
     * @param  array<int, array<string, mixed>>  $kriteria
     * @param  array<string, mixed>  $bobotInput  [kode_kriteria => bobot]
     * @return array{kriteria: array<int, array<string, mixed>>, total: float}
     *
     * @throws ValidationException
     */
    public function validateBobot(array $kriteria, array $bobotInput): array
    {
        if (empty($kriteria)) {
            throw ValidationException::withMessages([
                'kriteria' => ['Kriteria DSS belum tersedia. Jalankan seeder kriteria terlebih dahulu.'],
            ]);
        }

        $errors = [];
        $hasil = [];
        $total = 0.0;
        $kriteriaBerbobot = 0;

        foreach ($kriteria as $item) {
            $kode = $item['kode_kriteria'] ?? null;

            if (! $kode) {
                $errors['kriteria'][] = 'Terdapat kriteria tanpa kode_kriteria.';

                continue;
            }

            if (! array_key_exists($kode, $bobotInput)) {
                $errors['bobot.'.$kode][] = "Bobot untuk kriteria {$kode} wajib diisi.";

                continue;
            }

            $nilai = $bobotInput[$kode];

            if (! is_numeric($nilai)) {
                $errors['bobot.'.$kode][] = "Bobot kriteria {$kode} harus berupa angka.";

                continue;
            }

            $nilai = (float) $nilai;

            if ($nilai < 0) {
                $errors['bobot.'.$kode][] = "Bobot kriteria {$kode} tidak boleh negatif.";

                continue;
            }

            if ($nilai > 100) {
                $errors['bobot.'.$kode][] = "Bobot kriteria {$kode} tidak boleh melebihi 100.";

                continue;
            }

            if ($nilai > 0) {
                $kriteriaBerbobot++;
            }

            $total += $nilai;
            $hasil[$kode] = round($nilai, 2);
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        if (abs($total - 100) > self::TOLERANSI_BOBOT) {
            throw ValidationException::withMessages([
                'bobot' => [
                    sprintf(
                        'Total bobot kriteria harus 100%%. Total bobot yang dikirim saat ini %.2f%%.',
                        $total
                    ),
                ],
            ]);
        }

        if ($kriteriaBerbobot < 2) {
            throw ValidationException::withMessages([
                'bobot' => ['Minimal dua kriteria harus memiliki bobot lebih dari 0.'],
            ]);
        }

        return [
            'kriteria' => $kriteria,
            'bobot' => $hasil,
            'total' => round($total, 2),
        ];
    }

    /**
     * Hitung normalisasi SAW dan skor preferensi (Vi = Σ Wj × Rij).
     *
     * @param  array<int, array<string, mixed>>  $kriteria
     * @param  array<int, array<string, mixed>>  $alternatif  [['kode_alternatif','nama_alternatif','nilai'=>[kode=>nilai]]]
     * @param  array<string, float>  $bobot  [kode_kriteria => bobot persen]
     * @return array<string, mixed>
     */
    public function hitung(array $kriteria, array $alternatif, array $bobot): array
    {
        $peringatan = [];
        $kodeKriteria = array_map(fn ($k) => $k['kode_kriteria'], $kriteria);

        // 1. Susun matriks keputusan & bersihkan nilai tidak valid.
        $matriks = [];
        foreach ($alternatif as $alt) {
            $kodeAlt = $alt['kode_alternatif'] ?? 'ALT';
            $baris = [];

            foreach ($kodeKriteria as $kode) {
                $raw = $alt['nilai'][$kode] ?? null;

                if ($raw === null || $raw === '') {
                    $peringatan[] = "Nilai {$kode} untuk alternatif {$kodeAlt} kosong dan dianggap 0.";
                    $baris[$kode] = 0.0;

                    continue;
                }

                if (! is_numeric($raw)) {
                    $peringatan[] = "Nilai {$kode} untuk alternatif {$kodeAlt} tidak valid dan dianggap 0.";
                    $baris[$kode] = 0.0;

                    continue;
                }

                $nilai = (float) $raw;

                if ($nilai < 0) {
                    $peringatan[] = "Nilai {$kode} untuk alternatif {$kodeAlt} negatif dan dianggap 0.";
                    $nilai = 0.0;
                }

                $baris[$kode] = $nilai;
            }

            $matriks[$kodeAlt] = $baris;
        }

        if (empty($alternatif)) {
            $peringatan[] = 'Tidak ada alternatif yang memenuhi syarat pada periode ini.';
        }

        // 2. Tentukan nilai max (benefit) dan min (cost) tiap kriteria.
        $max = [];
        $min = [];
        foreach ($kodeKriteria as $kode) {
            $kolom = array_map(fn ($baris) => $baris[$kode], $matriks);
            $max[$kode] = empty($kolom) ? 0.0 : max($kolom);
            $min[$kode] = empty($kolom) ? 0.0 : min($kolom);
        }

        // 3. Normalisasi Rij.
        $normalisasi = [];
        foreach ($matriks as $kodeAlt => $baris) {
            foreach ($kriteria as $k) {
                $kode = $k['kode_kriteria'];
                $jenis = $k['jenis'] ?? 'benefit';
                $x = $baris[$kode];

                if ($jenis === 'cost') {
                    if ($x > 0) {
                        $r = $min[$kode] / $x;
                    } else {
                        // Biaya 0 dianggap biaya terendah (paling menguntungkan).
                        $r = 1.0;
                        $peringatan[] = "Nilai biaya {$kode} untuk alternatif {$kodeAlt} adalah 0; normalisasi diset 1.";
                    }
                } else {
                    $r = $max[$kode] > 0 ? $x / $max[$kode] : 0.0;
                }

                $normalisasi[$kodeAlt][$kode] = round($r, 6);
            }
        }

        // 4. Hitung skor preferensi Vi.
        $hasil = [];
        foreach ($alternatif as $alt) {
            $kodeAlt = $alt['kode_alternatif'] ?? 'ALT';
            $skor = 0.0;

            foreach ($kriteria as $k) {
                $kode = $k['kode_kriteria'];
                $bobotPersen = (float) ($bobot[$kode] ?? 0);
                $skor += ($bobotPersen / 100) * ($normalisasi[$kodeAlt][$kode] ?? 0);
            }

            $hasil[] = [
                'kode_alternatif' => $kodeAlt,
                'nama_alternatif' => $alt['nama_alternatif'] ?? $kodeAlt,
                'id_barang' => $alt['id_barang'] ?? null,
                'nilai' => $matriks[$kodeAlt],
                'normalisasi' => $normalisasi[$kodeAlt],
                'skor' => round($skor, 6),
                'peringkat' => 0,
            ];
        }

        // 5. Urutkan & beri peringkat (competition ranking untuk skor seri).
        usort($hasil, function ($a, $b) {
            if ($a['skor'] === $b['skor']) {
                return strcmp((string) $a['kode_alternatif'], (string) $b['kode_alternatif']);
            }

            return $b['skor'] <=> $a['skor'];
        });

        $peringkat = 0;
        $skorSebelumnya = null;
        foreach ($hasil as $index => &$row) {
            if ($skorSebelumnya === null || $row['skor'] < $skorSebelumnya) {
                $peringkat = $index + 1;
                $skorSebelumnya = $row['skor'];
            }
            $row['peringkat'] = $peringkat;
        }
        unset($row);

        $skorList = array_column($hasil, 'skor');

        return [
            'kriteria' => array_map(function ($k) use ($bobot) {
                return [
                    'kode_kriteria' => $k['kode_kriteria'],
                    'nama_kriteria' => $k['nama_kriteria'] ?? $k['kode_kriteria'],
                    'jenis' => $k['jenis'] ?? 'benefit',
                    'bobot' => (float) ($bobot[$k['kode_kriteria']] ?? 0),
                    'satuan' => $k['satuan'] ?? null,
                ];
            }, $kriteria),
            'normalisasi' => $normalisasi,
            'hasil' => $hasil,
            'ringkasan' => [
                'total_alternatif' => count($hasil),
                'total_kriteria' => count($kriteria),
                'skor_tertinggi' => empty($skorList) ? 0.0 : round(max($skorList), 6),
                'skor_terendah' => empty($skorList) ? 0.0 : round(min($skorList), 6),
                'nilai_max' => $max,
                'nilai_min' => $min,
            ],
            'peringatan' => array_values(array_unique($peringatan)),
        ];
    }

    /**
     * Susun kalimat rekomendasi & penjelasan hasil perhitungan.
     *
     * @param  array<string, mixed>  $hasilRow
     * @param  array<int, array<string, mixed>>  $kriteria
     * @param  array<string, mixed>  $konteks
     */
    public function buatRekomendasi(array $hasilRow, array $kriteria, array $konteks = []): string
    {
        $nama = $hasilRow['nama_alternatif'] ?? $hasilRow['kode_alternatif'];
        $skor = number_format((float) ($hasilRow['skor'] ?? 0), 4, ',', '.');
        $peringkat = $hasilRow['peringkat'] ?? '-';

        $alasan = [];
        foreach ($kriteria as $k) {
            $kode = $k['kode_kriteria'];
            $nilai = $hasilRow['nilai'][$kode] ?? 0;
            $bobot = $k['bobot'] ?? 0;
            $satuan = $k['satuan'] ?? '';
            $alasan[] = sprintf(
                '%s (%s%%) = %s %s',
                $k['nama_kriteria'] ?? $kode,
                rtrim(rtrim(number_format((float) $bobot, 2, ',', '.'), '0'), ','),
                number_format((float) $nilai, 2, ',', '.'),
                $satuan
            );
        }

        $sumber = $konteks['sumber'] ?? 'TPS, OAS, KMS, dan MIS';
        $periode = $konteks['periode_label'] ?? 'periode terpilih';

        return sprintf(
            '%s menempati peringkat %s dengan skor preferensi %s. Perhitungan SAW pada %s memakai kriteria: %s. Sumber data: %s.',
            $nama,
            $peringkat,
            $skor,
            $periode,
            implode('; ', $alasan),
            $sumber
        );
    }
}
