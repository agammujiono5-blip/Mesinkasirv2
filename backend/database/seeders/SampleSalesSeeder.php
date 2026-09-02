<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\DetailPembelian;
use App\Models\DetailTransaksi;
use App\Models\Diskon;
use App\Models\Kategori;
use App\Models\Pembelian;
use App\Models\StokLog;
use App\Models\Supplier;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class SampleSalesSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Get or ensure Users
        $admin = User::where('role', 'admin')->first();
        $kasir = User::where('role', 'kasir')->first();
        $pelanggan = User::where('role', 'pelanggan')->first();

        if (!$admin || !$kasir) {
            $this->command->info('Please run DatabaseSeeder first.');
            return;
        }

        // 2. Categories
        $katMakanan = Kategori::firstOrCreate(['nama_kategori' => 'Makanan & Minuman']);
        $katElektronik = Kategori::firstOrCreate(['nama_kategori' => 'Elektronik & Gadget']);
        $katAlatTulis = Kategori::firstOrCreate(['nama_kategori' => 'Alat Tulis & Kantor']);
        $katFashion = Kategori::firstOrCreate(['nama_kategori' => 'Pakaian & Aksesoris']);
        $katKebutuhan = Kategori::firstOrCreate(['nama_kategori' => 'Kebutuhan Harian']);

        // 3. Suppliers
        $sup1 = Supplier::firstOrCreate(
            ['nama_supplier' => 'PT Sumber Makmur Sejahtera'],
            [
                'kontak' => '081122334455',
                'alamat' => 'Kawasan Industri Rungkut, Surabaya',
                'email' => 'sales@sumbermakmur.com',
            ]
        );
        $sup2 = Supplier::firstOrCreate(
            ['nama_supplier' => 'CV Berkah Distribusi Utama'],
            [
                'kontak' => '082233445566',
                'alamat' => 'Jl. Gatot Subroto No. 45, Jakarta',
                'email' => 'info@berkahdistribusi.com',
            ]
        );

        // 4. Products list
        $productsData = [
            ['kode' => 'BRG-001', 'nama' => 'Kopi Arabika Premium 250g', 'kat' => $katMakanan->id_kategori, 'sup' => $sup1->id_supplier, 'beli' => 35000, 'jual' => 50000, 'stok' => 85, 'min' => 10, 'satuan' => 'pack'],
            ['kode' => 'BRG-002', 'nama' => 'Wireless Mouse Ergonomic', 'kat' => $katElektronik->id_kategori, 'sup' => $sup2->id_supplier, 'beli' => 75000, 'jual' => 120000, 'stok' => 42, 'min' => 5, 'satuan' => 'unit'],
            ['kode' => 'BRG-003', 'nama' => 'Buku Catatan Hardcover A5', 'kat' => $katAlatTulis->id_kategori, 'sup' => $sup1->id_supplier, 'beli' => 15000, 'jual' => 25000, 'stok' => 150, 'min' => 20, 'satuan' => 'pcs'],
            ['kode' => 'BRG-004', 'nama' => 'Mechanical Keyboard RGB TKL', 'kat' => $katElektronik->id_kategori, 'sup' => $sup2->id_supplier, 'beli' => 280000, 'jual' => 450000, 'stok' => 18, 'min' => 3, 'satuan' => 'unit'],
            ['kode' => 'BRG-005', 'nama' => 'Matcha Latte Bubuk 500g', 'kat' => $katMakanan->id_kategori, 'sup' => $sup1->id_supplier, 'beli' => 45000, 'jual' => 68000, 'stok' => 60, 'min' => 8, 'satuan' => 'pack'],
            ['kode' => 'BRG-006', 'nama' => 'Pulpen Gel Hitam 0.5mm (Pack 12)', 'kat' => $katAlatTulis->id_kategori, 'sup' => $sup1->id_supplier, 'beli' => 18000, 'jual' => 30000, 'stok' => 95, 'min' => 15, 'satuan' => 'pack'],
            ['kode' => 'BRG-007', 'nama' => 'Kaos Polos Cotton Combed 30s', 'kat' => $katFashion->id_kategori, 'sup' => $sup2->id_supplier, 'beli' => 32000, 'jual' => 55000, 'stok' => 70, 'min' => 10, 'satuan' => 'pcs'],
            ['kode' => 'BRG-008', 'nama' => 'Kabel Data Type-C Fast Charging', 'kat' => $katElektronik->id_kategori, 'sup' => $sup2->id_supplier, 'beli' => 15000, 'jual' => 35000, 'stok' => 120, 'min' => 10, 'satuan' => 'pcs'],
            ['kode' => 'BRG-009', 'nama' => 'Tumbler Stainless Steel 500ml', 'kat' => $katKebutuhan->id_kategori, 'sup' => $sup1->id_supplier, 'beli' => 40000, 'jual' => 75000, 'stok' => 35, 'min' => 5, 'satuan' => 'pcs'],
            ['kode' => 'BRG-010', 'nama' => 'Tas Ransel Laptop Waterproof', 'kat' => $katFashion->id_kategori, 'sup' => $sup2->id_supplier, 'beli' => 110000, 'jual' => 185000, 'stok' => 4, 'min' => 5, 'satuan' => 'unit'],
        ];

        $barangs = [];
        foreach ($productsData as $p) {
            $barangs[$p['kode']] = Barang::updateOrCreate(
                ['kode_barang' => $p['kode']],
                [
                    'id_kategori' => $p['kat'],
                    'id_supplier' => $p['sup'],
                    'nama_barang' => $p['nama'],
                    'deskripsi' => $p['nama'] . ' kualitas terbaik',
                    'harga_beli' => $p['beli'],
                    'harga_jual' => $p['jual'],
                    'stok' => $p['stok'],
                    'stok_minimum' => $p['min'],
                    'satuan' => $p['satuan'],
                ]
            );
        }

        // 5. Active Discount
        $diskonKopi = Diskon::firstOrCreate(
            ['nama_diskon' => 'Promo Diskon Kopi 10%'],
            [
                'id_barang' => $barangs['BRG-001']->id_barang,
                'tipe' => 'persen',
                'nilai' => 10,
                'tanggal_mulai' => Carbon::now()->subDays(10)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(20)->toDateString(),
                'status' => 'aktif',
            ]
        );

        $diskonKabel = Diskon::firstOrCreate(
            ['nama_diskon' => 'Diskon Spesial Aksesoris Rp 5.000'],
            [
                'id_barang' => $barangs['BRG-008']->id_barang,
                'tipe' => 'nominal',
                'nilai' => 5000,
                'tanggal_mulai' => Carbon::now()->subDays(5)->toDateString(),
                'tanggal_selesai' => Carbon::now()->addDays(25)->toDateString(),
                'status' => 'aktif',
            ]
        );

        // 6. Generate Realistic Sales Transactions for the last 7 days + today
        $transactionScenarios = [
            // 6 days ago
            [
                'days_ago' => 6,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 3],
                    ['barang' => 'BRG-003', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 6,
                'kasir_id' => $admin->id_user,
                'metode' => 'qris',
                'items' => [
                    ['barang' => 'BRG-002', 'qty' => 1],
                ],
            ],

            // 5 days ago
            [
                'days_ago' => 5,
                'kasir_id' => $kasir->id_user,
                'metode' => 'transfer',
                'items' => [
                    ['barang' => 'BRG-004', 'qty' => 1],
                    ['barang' => 'BRG-008', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 5,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-005', 'qty' => 2],
                    ['barang' => 'BRG-006', 'qty' => 1],
                ],
            ],

            // 4 days ago
            [
                'days_ago' => 4,
                'kasir_id' => $admin->id_user,
                'metode' => 'qris',
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 4],
                    ['barang' => 'BRG-007', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 4,
                'kasir_id' => $kasir->id_user,
                'metode' => 'debit',
                'items' => [
                    ['barang' => 'BRG-009', 'qty' => 2],
                    ['barang' => 'BRG-002', 'qty' => 1],
                ],
            ],

            // 3 days ago
            [
                'days_ago' => 3,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-003', 'qty' => 5],
                    ['barang' => 'BRG-006', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 3,
                'kasir_id' => $kasir->id_user,
                'metode' => 'qris',
                'items' => [
                    ['barang' => 'BRG-010', 'qty' => 1],
                    ['barang' => 'BRG-007', 'qty' => 1],
                ],
            ],

            // 2 days ago
            [
                'days_ago' => 2,
                'kasir_id' => $admin->id_user,
                'metode' => 'transfer',
                'items' => [
                    ['barang' => 'BRG-004', 'qty' => 2],
                    ['barang' => 'BRG-002', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 2,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 2],
                    ['barang' => 'BRG-005', 'qty' => 1],
                    ['barang' => 'BRG-008', 'qty' => 3],
                ],
            ],

            // Yesterday
            [
                'days_ago' => 1,
                'kasir_id' => $kasir->id_user,
                'metode' => 'qris',
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 5],
                    ['barang' => 'BRG-009', 'qty' => 1],
                ],
            ],
            [
                'days_ago' => 1,
                'kasir_id' => $admin->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-007', 'qty' => 3],
                    ['barang' => 'BRG-003', 'qty' => 4],
                ],
            ],
            [
                'days_ago' => 1,
                'kasir_id' => $kasir->id_user,
                'metode' => 'debit',
                'items' => [
                    ['barang' => 'BRG-002', 'qty' => 2],
                    ['barang' => 'BRG-004', 'qty' => 1],
                ],
            ],

            // TODAY
            [
                'days_ago' => 0,
                'hours_ago' => 6,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 2],
                    ['barang' => 'BRG-005', 'qty' => 1],
                ],
            ],
            [
                'days_ago' => 0,
                'hours_ago' => 4,
                'kasir_id' => $kasir->id_user,
                'metode' => 'qris',
                'items' => [
                    ['barang' => 'BRG-002', 'qty' => 1],
                    ['barang' => 'BRG-008', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 0,
                'hours_ago' => 3,
                'kasir_id' => $admin->id_user,
                'metode' => 'transfer',
                'items' => [
                    ['barang' => 'BRG-004', 'qty' => 1],
                    ['barang' => 'BRG-009', 'qty' => 1],
                ],
            ],
            [
                'days_ago' => 0,
                'hours_ago' => 2,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-007', 'qty' => 2],
                    ['barang' => 'BRG-003', 'qty' => 3],
                    ['barang' => 'BRG-006', 'qty' => 1],
                ],
            ],
            [
                'days_ago' => 0,
                'hours_ago' => 1,
                'kasir_id' => $kasir->id_user,
                'metode' => 'qris',
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 3],
                    ['barang' => 'BRG-009', 'qty' => 2],
                ],
            ],
            [
                'days_ago' => 0,
                'hours_ago' => 0,
                'kasir_id' => $kasir->id_user,
                'metode' => 'cash',
                'items' => [
                    ['barang' => 'BRG-002', 'qty' => 1],
                    ['barang' => 'BRG-007', 'qty' => 1],
                ],
            ],
        ];

        $trxCounter = Transaksi::count() + 100;

        foreach ($transactionScenarios as $idx => $scenario) {
            $trxDate = Carbon::now()->subDays($scenario['days_ago']);
            if (isset($scenario['hours_ago'])) {
                $trxDate = $trxDate->copy()->subHours($scenario['hours_ago'])->subMinutes(rand(5, 45));
            } else {
                $trxDate = $trxDate->copy()->setTime(rand(9, 20), rand(10, 59), rand(0, 59));
            }

            $noTrx = 'TRX-' . $trxDate->format('Ymd') . '-PR' . str_pad($trxCounter++, 3, '0', STR_PAD_LEFT);

            // Calculate total
            $totalHarga = 0;
            $detailList = [];

            foreach ($scenario['items'] as $itemSpec) {
                $b = $barangs[$itemSpec['barang']];
                $hargaSatuan = $b->harga_jual;
                $hargaSetelahDiskon = $hargaSatuan;
                $idDiskon = null;

                if ($itemSpec['barang'] === 'BRG-001') {
                    $hargaSetelahDiskon = $hargaSatuan * 0.90;
                    $idDiskon = $diskonKopi->id_diskon;
                }

                $subtotal = $hargaSetelahDiskon * $itemSpec['qty'];
                $totalHarga += $subtotal;

                $detailList[] = [
                    'id_barang' => $b->id_barang,
                    'jumlah' => $itemSpec['qty'],
                    'harga_satuan' => $hargaSatuan,
                    'id_diskon' => $idDiskon,
                    'harga_setelah_diskon' => $hargaSetelahDiskon,
                    'subtotal' => $subtotal,
                ];
            }

            // Create Transaksi
            $trx = Transaksi::create([
                'no_transaksi' => $noTrx,
                'id_kasir' => $scenario['kasir_id'],
                'id_pelanggan' => $pelanggan ? $pelanggan->id_user : null,
                'tanggal' => $trxDate,
                'total_harga' => $totalHarga,
                'metode_bayar' => $scenario['metode'],
                'status' => 'selesai',
                'created_at' => $trxDate,
                'updated_at' => $trxDate,
            ]);

            // Create Detail Transaksi & Stok Log
            foreach ($detailList as $det) {
                DetailTransaksi::create([
                    'id_transaksi' => $trx->id_transaksi,
                    'id_barang' => $det['id_barang'],
                    'jumlah' => $det['jumlah'],
                    'harga_satuan' => $det['harga_satuan'],
                    'id_diskon' => $det['id_diskon'],
                    'harga_setelah_diskon' => $det['harga_setelah_diskon'],
                    'subtotal' => $det['subtotal'],
                    'created_at' => $trxDate,
                    'updated_at' => $trxDate,
                ]);

                $log = new StokLog([
                    'id_barang' => $det['id_barang'],
                    'id_user' => $scenario['kasir_id'],
                    'jenis' => 'keluar',
                    'jumlah' => $det['jumlah'],
                    'stok_sebelum' => 100,
                    'stok_sesudah' => 100 - $det['jumlah'],
                    'keterangan' => 'Penjualan ' . $noTrx,
                    'referensi' => $noTrx,
                ]);
                $log->created_at = $trxDate;
                $log->saveQuietly();
            }
        }

        // 7. Generate Sample Restock / Purchases from Suppliers
        $pembelianScenarios = [
            [
                'days_ago' => 5,
                'supplier_id' => $sup1->id_supplier,
                'items' => [
                    ['barang' => 'BRG-001', 'qty' => 50, 'harga_beli' => 35000],
                    ['barang' => 'BRG-003', 'qty' => 100, 'harga_beli' => 15000],
                ],
            ],
            [
                'days_ago' => 2,
                'supplier_id' => $sup2->id_supplier,
                'items' => [
                    ['barang' => 'BRG-002', 'qty' => 30, 'harga_beli' => 75000],
                    ['barang' => 'BRG-004', 'qty' => 10, 'harga_beli' => 280000],
                ],
            ],
        ];

        $beliCounter = Pembelian::count() + 10;
        foreach ($pembelianScenarios as $pb) {
            $pbDate = Carbon::now()->subDays($pb['days_ago'])->setTime(10, 30);
            $noPembelian = 'PO-' . $pbDate->format('Ymd') . '-' . str_pad($beliCounter++, 3, '0', STR_PAD_LEFT);

            $totalBeli = 0;
            foreach ($pb['items'] as $it) {
                $totalBeli += $it['qty'] * $it['harga_beli'];
            }

            $pembelian = Pembelian::create([
                'no_pembelian' => $noPembelian,
                'id_supplier' => $pb['supplier_id'],
                'id_admin' => $admin->id_user,
                'tanggal' => $pbDate,
                'total_harga' => $totalBeli,
                'status' => 'selesai',
                'created_at' => $pbDate,
                'updated_at' => $pbDate,
            ]);

            foreach ($pb['items'] as $it) {
                $b = $barangs[$it['barang']];
                DetailPembelian::create([
                    'id_pembelian' => $pembelian->id_pembelian,
                    'id_barang' => $b->id_barang,
                    'jumlah' => $it['qty'],
                    'harga_beli_satuan' => $it['harga_beli'],
                    'subtotal' => $it['qty'] * $it['harga_beli'],
                    'created_at' => $pbDate,
                    'updated_at' => $pbDate,
                ]);

                $pLog = new StokLog([
                    'id_barang' => $b->id_barang,
                    'id_user' => $admin->id_user,
                    'jenis' => 'masuk',
                    'jumlah' => $it['qty'],
                    'stok_sebelum' => $b->stok,
                    'stok_sesudah' => $b->stok + $it['qty'],
                    'keterangan' => 'Restok Pembelian ' . $noPembelian,
                    'referensi' => $noPembelian,
                ]);
                $pLog->created_at = $pbDate;
                $pLog->saveQuietly();
            }
        }
    }
}
