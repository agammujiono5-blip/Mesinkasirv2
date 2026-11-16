<?php

namespace Database\Seeders;

use App\Models\DssKriteria;
use Illuminate\Database\Seeder;

/**
 * Kriteria awal DSS (metode SAW) untuk domain nyata project: prioritas restok barang.
 *
 * Total bobot = 100%.
 * C1 & C2 & C4 = benefit, C3 = cost (semakin murah semakin baik).
 */
class DssKriteriaSeeder extends Seeder
{
    public function run(): void
    {
        $kriteria = [
            [
                'kode_kriteria' => 'C1',
                'nama_kriteria' => 'Urgensi Kebutuhan Stok',
                'deskripsi' => 'Tingkat kekritisan stok terhadap laju penjualan (coverage days) dan batas stok minimum.',
                'jenis' => 'benefit',
                'bobot' => 35,
                'satuan' => 'poin',
                'urutan' => 1,
            ],
            [
                'kode_kriteria' => 'C2',
                'nama_kriteria' => 'Tingkat Permintaan',
                'deskripsi' => 'Jumlah unit terjual pada periode analisis (data transaksi TPS).',
                'jenis' => 'benefit',
                'bobot' => 25,
                'satuan' => 'unit',
                'urutan' => 2,
            ],
            [
                'kode_kriteria' => 'C3',
                'nama_kriteria' => 'Estimasi Biaya Pengadaan',
                'deskripsi' => 'Perkiraan biaya pembelian ulang berdasarkan harga beli dan jumlah restok yang disarankan.',
                'jenis' => 'cost',
                'bobot' => 20,
                'satuan' => 'rupiah',
                'urutan' => 3,
            ],
            [
                'kode_kriteria' => 'C4',
                'nama_kriteria' => 'Dampak Layanan & Pendapatan',
                'deskripsi' => 'Kontribusi pendapatan barang terhadap total omset dan risiko kehilangan penjualan bila stok habis.',
                'jenis' => 'benefit',
                'bobot' => 20,
                'satuan' => 'poin',
                'urutan' => 4,
            ],
        ];

        foreach ($kriteria as $row) {
            DssKriteria::updateOrCreate(
                ['kode_kriteria' => $row['kode_kriteria']],
                $row + ['aktif' => true]
            );
        }
    }
}
