<?php

namespace Database\Seeders;

use App\Models\EsGejala;
use App\Models\EsKerusakan;
use App\Models\EsRule;
use Illuminate\Database\Seeder;

/**
 * Basis pengetahuan Expert System untuk domain operasional toko.
 *
 * Setiap hipotesis (kerusakan/kondisi) memiliki beberapa rule:
 * IF gejala THEN hipotesis [CF pakar].
 * Nilai CF pakar pakar/ahli 0.40 - 0.90; ambang teridentifikasi 0.35.
 */
class EsBasisPengetahuanSeeder extends Seeder
{
    public function run(): void
    {
        $kerusakan = [
            [
                'kode_kerusakan' => 'K01',
                'nama_kerusakan' => 'Selisih Stok Fisik (Stock Opname Berbeda)',
                'kategori' => 'stok',
                'deskripsi' => 'Jumlah stok di sistem tidak sama dengan jumlah fisik di gudang/rak, sehingga laporan inventori tidak akurat.',
                'solusi' => "1. Hentikan transaksi sementara pada SKU terkait.\n2. Cocokkan stok sistem dengan hasil hitung fisik per rak.\n3. Periksa log stok untuk transaksi batal atau keluar tanpa referensi.\n4. Lakukan penyesuaian lewat menu Log & Audit Stok dengan keterangan opname.\n5. Jadwalkan opname berkala (harian untuk fast-moving goods).",
                'tingkat_urgensi' => 'tinggi',
            ],
            [
                'kode_kerusakan' => 'K02',
                'nama_kerusakan' => 'Stok Tidak Cukup untuk Permintaan',
                'kategori' => 'stok',
                'deskripsi' => 'Laju penjualan melampaui ketersediaan stok sehingga barang cepat habis atau ditolak pembeli.',
                'solusi' => "1. Periksa rekomendasi prioritas restok pada modul DSS.\n2. Naikkan nilai stok minimum untuk SKU fast-moving.\n3. Ajukan pembelian ke supplier sekaligus untuk beberapa hari ke depan.\n4. Aktifkan notifikasi stok kritis pada dashboard.",
                'tingkat_urgensi' => 'tinggi',
            ],
            [
                'kode_kerusakan' => 'K03',
                'nama_kerusakan' => 'Barang Menganggur (Slow Moving / Overstock)',
                'kategori' => 'stok',
                'deskripsi' => 'Persediaan menumpuk karena perputaran lambat, mengikat modal dan memakan ruang gudang.',
                'solusi' => "1. Identifikasi SKU dengan perputaran terendah pada laporan MIS.\n2. Turunkan jumlah restok untuk SKU tersebut.\n3. Buat bundling atau promo terbatas bersama menu Diskon.\n4. Pertimbangkan retur/tukar ke supplier untuk barang mendekati kedaluwarsa.",
                'tingkat_urgensi' => 'sedang',
            ],
            [
                'kode_kerusakan' => 'K04',
                'nama_kerusakan' => 'Ketidaksesuaian Harga atau Diskon',
                'kategori' => 'penjualan',
                'deskripsi' => 'Total transaksi tidak sesuai harga katalog karena harga ganda, diskon bertumpuk, atau diskon kedaluwarsa.',
                'solusi' => "1. Periksa periode aktif promo pada menu Diskon.\n2. Pastikan hanya satu diskon berlaku per barang.\n3. Bandingkan harga jual katalog dengan nilai pada detail transaksi.\n4. Batalkan transaksi bermasalah agar stok kembali konsisten.",
                'tingkat_urgensi' => 'sedang',
            ],
            [
                'kode_kerusakan' => 'K05',
                'nama_kerusakan' => 'Penyebab Penjualan Menurun',
                'kategori' => 'penjualan',
                'deskripsi' => 'Omzet pada periode terakhir turun dibanding periode sebelumnya meskipun stok tersedia.',
                'solusi' => "1. Bandingkan tren harian pada dashboard MIS.\n2. Cek SKU kontributor utama apakah sedang kosong atau tidak tampil.\n3. Tinjau efektivitas promo terakhir.\n4. Evaluasi jam operasional dan jumlah kasir aktif.",
                'tingkat_urgensi' => 'sedang',
            ],
            [
                'kode_kerusakan' => 'K06',
                'nama_kerusakan' => 'Transaksi Gagal atau Tertahan (Pending)',
                'kategori' => 'pembayaran',
                'deskripsi' => 'Transaksi tidak terselesaikan sehingga tercatat pending/batal pada sistem pembayaran.',
                'solusi' => "1. Periksa status transaksi pada menu Pesanan & Transaksi.\n2. Pastikan koneksi EDC/QRIS stabil saat settlement.\n3. Catat nomor referensi pembayaran untuk rekonsiliasi.\n4. Batalkan transaksi yang tidak selesai agar stok dan kas seimbang.",
                'tingkat_urgensi' => 'tinggi',
            ],
            [
                'kode_kerusakan' => 'K07',
                'nama_kerusakan' => 'Selisih Kas Kasir',
                'kategori' => 'pembayaran',
                'deskripsi' => 'Uang tunai di drawer kasir tidak sesuai dengan total transaksi tunai yang tercatat.',
                'solusi' => "1. Lakukan hitung ulang kas bersama kasir dan supervisor.\n2. Cocokkan struk tunai dengan transaksi bertanda selesai.\n3. Periksa transaksi batal atau kembalian yang salah input.\n4. Terapkan SOP tutup kasir dan serah terima shift.",
                'tingkat_urgensi' => 'tinggi',
            ],
            [
                'kode_kerusakan' => 'K08',
                'nama_kerusakan' => 'Kesalahan Input Data Master',
                'kategori' => 'umum',
                'deskripsi' => 'Data barang, kategori, atau supplier tidak konsisten sehingga muncul duplikasi atau data tidak lengkap.',
                'solusi' => "1. Cari duplikasi berdasarkan kode barang dan nama.\n2. Lengkapi kolom harga beli, harga jual, dan stok minimum.\n3. Satuan dan kategori wajib konsisten antar SKU sejenis.\n4. Gunakan format penomoran kode barang yang baku.",
                'tingkat_urgensi' => 'rendah',
            ],
            [
                'kode_kerusakan' => 'K09',
                'nama_kerusakan' => 'Riwayat Perubahan Stok Tidak Terlacak',
                'kategori' => 'opname',
                'deskripsi' => 'Stok berubah tanpa catatan log yang jelas sehingga penyebab selisih tidak dapat ditelusuri.',
                'solusi' => "1. Pastikan setiap perubahan stok (jual, beli, penyesuaian) memiliki referensi.\n2. Hindari edit langsung ke kolom stok pada database.\n3. Periksa log dengan jenis penyesuaian tanpa keterangan.\n4. Wajibkan form alasan pada setiap stock opname.",
                'tingkat_urgensi' => 'sedang',
            ],
            [
                'kode_kerusakan' => 'K10',
                'nama_kerusakan' => 'Barang Mendekati Kedaluwarsa',
                'kategori' => 'stok',
                'deskripsi' => 'Terdapat stok dengan masa simpan pendek yang berisiko rusak atau tidak layak jual.',
                'solusi' => "1. Terapkan prinsip FIFO pada penataan rak.\n2. Buat promo cepat untuk stok berumur tua.\n3. Kurangi jumlah restok barang bermasa simpan pendek.\n4. Koordinasi dengan supplier untuk kebijakan retur.",
                'tingkat_urgensi' => 'sedang',
            ],
        ];

        $gejala = [
            ['kode_gejala' => 'G01', 'nama_gejala' => 'Stok sistem berbeda dengan hasil hitung fisik', 'kelompok' => 'stok', 'urutan' => 1],
            ['kode_gejala' => 'G02', 'nama_gejala' => 'Ditemukan transaksi batal yang memengaruhi stok', 'kelompok' => 'stok', 'urutan' => 2],
            ['kode_gejala' => 'G03', 'nama_gejala' => 'Ada log stok tanpa referensi atau keterangan', 'kelompok' => 'stok', 'urutan' => 3],
            ['kode_gejala' => 'G04', 'nama_gejala' => 'Barang sering habis saat masih ada permintaan', 'kelompok' => 'stok', 'urutan' => 4],
            ['kode_gejala' => 'G05', 'nama_gejala' => 'Stok berada di bawah batas minimum', 'kelompok' => 'stok', 'urutan' => 5],
            ['kode_gejala' => 'G06', 'nama_gejala' => 'Stok menumpuk dan perputaran lambat', 'kelompok' => 'stok', 'urutan' => 6],
            ['kode_gejala' => 'G07', 'nama_gejala' => 'Banyak modal terikat pada barang tidak terjual', 'kelompok' => 'stok', 'urutan' => 7],
            ['kode_gejala' => 'G08', 'nama_gejala' => 'Barang mendekati tanggal kedaluwarsa', 'kelompok' => 'stok', 'urutan' => 8],
            ['kode_gejala' => 'G09', 'nama_gejala' => 'Total transaksi tidak sesuai harga katalog', 'kelompok' => 'penjualan', 'urutan' => 9],
            ['kode_gejala' => 'G10', 'nama_gejala' => 'Diskon aktif bertumpuk atau sudah kedaluwarsa', 'kelompok' => 'penjualan', 'urutan' => 10],
            ['kode_gejala' => 'G11', 'nama_gejala' => 'Omzet periode ini turun dibanding periode sebelumnya', 'kelompok' => 'penjualan', 'urutan' => 11],
            ['kode_gejala' => 'G12', 'nama_gejala' => 'Produk terlaris sedang kosong atau tidak tampil', 'kelompok' => 'penjualan', 'urutan' => 12],
            ['kode_gejala' => 'G13', 'nama_gejala' => 'Banyak transaksi berstatus pending atau gagal', 'kelompok' => 'pembayaran', 'urutan' => 13],
            ['kode_gejala' => 'G14', 'nama_gejala' => 'Pembayaran QRIS/EDC gagal saat settlement', 'kelompok' => 'pembayaran', 'urutan' => 14],
            ['kode_gejala' => 'G15', 'nama_gejala' => 'Uang kas tunai tidak sesuai catatan transaksi', 'kelompok' => 'pembayaran', 'urutan' => 15],
            ['kode_gejala' => 'G16', 'nama_gejala' => 'Selisih terjadi di akhir shift kasir', 'kelompok' => 'pembayaran', 'urutan' => 16],
            ['kode_gejala' => 'G17', 'nama_gejala' => 'Ditemukan data barang/lokasi ganda', 'kelompok' => 'umum', 'urutan' => 17],
            ['kode_gejala' => 'G18', 'nama_gejala' => 'Data harga atau satuan tidak lengkap', 'kelompok' => 'umum', 'urutan' => 18],
            ['kode_gejala' => 'G19', 'nama_gejala' => 'Perubahan stok tidak memiliki jejak audit', 'kelompok' => 'opname', 'urutan' => 19],
            ['kode_gejala' => 'G20', 'nama_gejala' => 'Stock opname jarang atau tidak terjadwal', 'kelompok' => 'opname', 'urutan' => 20],
        ];

        // Matriks kepakaran: [kode_kerusakan => [kode_gejala => cf_pakar]]
        $aturan = [
            'K01' => ['G01' => 0.90, 'G02' => 0.70, 'G03' => 0.60],
            'K02' => ['G04' => 0.80, 'G05' => 0.90, 'G12' => 0.50],
            'K03' => ['G06' => 0.85, 'G07' => 0.70],
            'K04' => ['G09' => 0.80, 'G10' => 0.85],
            'K05' => ['G11' => 0.85, 'G12' => 0.65],
            'K06' => ['G13' => 0.80, 'G14' => 0.75],
            'K07' => ['G15' => 0.85, 'G16' => 0.75],
            'K08' => ['G17' => 0.70, 'G18' => 0.65],
            'K09' => ['G03' => 0.80, 'G19' => 0.85],
            'K10' => ['G08' => 0.85],
        ];

        foreach ($kerusakan as $row) {
            EsKerusakan::updateOrCreate(
                ['kode_kerusakan' => $row['kode_kerusakan']],
                $row + ['aktif' => true]
            );
        }

        foreach ($gejala as $row) {
            EsGejala::updateOrCreate(
                ['kode_gejala' => $row['kode_gejala']],
                $row + ['aktif' => true]
            );
        }

        foreach ($aturan as $kodeKerusakan => $daftarGejala) {
            $urut = 1;
            foreach ($daftarGejala as $kodeGejala => $cfPakar) {
                EsRule::updateOrCreate(
                    ['kode_kerusakan' => $kodeKerusakan, 'kode_gejala' => $kodeGejala],
                    [
                        'kode_rule' => sprintf('%s-%02d', $kodeKerusakan, $urut),
                        'cf_pakar' => $cfPakar,
                        'aktif' => true,
                    ]
                );
                $urut++;
            }
        }
    }
}
