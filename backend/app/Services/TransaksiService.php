<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\Diskon;
use App\Models\StokLog;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TransaksiService
{
    /**
     * Get paginated transactions.
     */
    public function getAll(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Transaksi::with(['pelanggan', 'kasir', 'detailTransaksi.barang', 'detailTransaksi.diskon']);

        if (!empty($filters['no_transaksi'])) {
            $query->where('no_transaksi', 'like', "%{$filters['no_transaksi']}%");
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['metode_bayar'])) {
            $query->where('metode_bayar', $filters['metode_bayar']);
        }

        if (!empty($filters['id_kasir'])) {
            $query->where('id_kasir', $filters['id_kasir']);
        }

        if (!empty($filters['id_pelanggan'])) {
            $query->where('id_pelanggan', $filters['id_pelanggan']);
        }

        if (!empty($filters['tanggal_awal']) && !empty($filters['tanggal_akhir'])) {
            $query->whereBetween('tanggal', [
                Carbon::parse($filters['tanggal_awal'])->startOfDay(),
                Carbon::parse($filters['tanggal_akhir'])->endOfDay(),
            ]);
        }

        return $query->latest('id_transaksi')->paginate($perPage);
    }

    /**
     * Find transaction by ID.
     */
    public function findById(int $id): Transaksi
    {
        return Transaksi::with([
            'pelanggan',
            'kasir',
            'detailTransaksi.barang.kategori',
            'detailTransaksi.diskon',
        ])->findOrFail($id);
    }

    /**
     * Create a new sales transaction.
     */
    public function create(array $data, User $kasir): Transaksi
    {
        if (empty($data['items']) || !is_array($data['items'])) {
            throw ValidationException::withMessages([
                'items' => ['Daftar barang transaksi tidak boleh kosong.'],
            ]);
        }

        return DB::transaction(function () use ($data, $kasir) {
            $noTransaksi = 'TRX-' . date('Ymd') . '-' . strtoupper(Str::random(5));
            $totalHarga = 0;
            $itemsToInsert = [];
            $stokLogsToInsert = [];

            foreach ($data['items'] as $item) {
                $barang = Barang::lockForUpdate()->find($item['id_barang']);

                if (!$barang) {
                    throw ValidationException::withMessages([
                        'items' => ["Barang dengan ID {$item['id_barang']} tidak ditemukan."],
                    ]);
                }

                $jumlah = (int) $item['jumlah'];
                if ($jumlah <= 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Jumlah untuk barang {$barang->nama_barang} harus lebih dari 0."],
                    ]);
                }

                if ($barang->stok < $jumlah) {
                    throw ValidationException::withMessages([
                        'items' => ["Stok untuk barang {$barang->nama_barang} tidak mencukupi (Tersedia: {$barang->stok}, Diminta: {$jumlah})."],
                    ]);
                }

                $hargaSatuan = $barang->harga_jual;
                $idDiskon = $item['id_diskon'] ?? null;
                $hargaSetelahDiskon = $hargaSatuan;

                if ($idDiskon) {
                    $diskon = Diskon::find($idDiskon);
                    if ($diskon && $diskon->status === 'aktif') {
                        if ($diskon->tipe === 'persen') {
                            $potongan = ($hargaSatuan * $diskon->nilai) / 100;
                            $hargaSetelahDiskon = max(0, $hargaSatuan - $potongan);
                        } else {
                            $hargaSetelahDiskon = max(0, $hargaSatuan - $diskon->nilai);
                        }
                    } else {
                        $idDiskon = null;
                    }
                }

                $subtotal = $hargaSetelahDiskon * $jumlah;
                $totalHarga += $subtotal;

                $stokSebelum = $barang->stok;
                $stokSesudah = $stokSebelum - $jumlah;
                $barang->update(['stok' => $stokSesudah]);

                $itemsToInsert[] = [
                    'id_barang' => $barang->id_barang,
                    'jumlah' => $jumlah,
                    'harga_satuan' => $hargaSatuan,
                    'id_diskon' => $idDiskon,
                    'harga_setelah_diskon' => $hargaSetelahDiskon,
                    'subtotal' => $subtotal,
                ];

                $stokLogsToInsert[] = [
                    'id_barang' => $barang->id_barang,
                    'jenis' => 'keluar',
                    'jumlah' => $jumlah,
                    'stok_sebelum' => $stokSebelum,
                    'stok_sesudah' => $stokSesudah,
                    'referensi' => $noTransaksi,
                    'keterangan' => "Penjualan Kasir ({$noTransaksi})",
                    'id_user' => $kasir->id_user,
                    'created_at' => now(),
                ];
            }

            $transaksi = Transaksi::create([
                'no_transaksi' => $noTransaksi,
                'id_pelanggan' => $data['id_pelanggan'] ?? null,
                'id_kasir' => $kasir->id_user,
                'tanggal' => $data['tanggal'] ?? now(),
                'total_harga' => $totalHarga,
                'metode_bayar' => $data['metode_bayar'] ?? 'cash',
                'status' => 'selesai',
            ]);

            foreach ($itemsToInsert as $detail) {
                $detail['id_transaksi'] = $transaksi->id_transaksi;
                DetailTransaksi::create($detail);
            }

            foreach ($stokLogsToInsert as $log) {
                StokLog::create($log);
            }

            return $transaksi->fresh([
                'pelanggan',
                'kasir',
                'detailTransaksi.barang',
                'detailTransaksi.diskon',
            ]);
        });
    }

    /**
     * Cancel a transaction and restore stock.
     */
    public function cancel(Transaksi $transaksi, User $user): Transaksi
    {
        if ($transaksi->status === 'batal') {
            throw ValidationException::withMessages([
                'status' => ['Transaksi ini sudah dibatalkan sebelumnya.'],
            ]);
        }

        return DB::transaction(function () use ($transaksi, $user) {
            foreach ($transaksi->detailTransaksi as $detail) {
                $barang = Barang::lockForUpdate()->find($detail->id_barang);
                if ($barang) {
                    $stokSebelum = $barang->stok;
                    $stokSesudah = $stokSebelum + $detail->jumlah;
                    $barang->update(['stok' => $stokSesudah]);

                    StokLog::create([
                        'id_barang' => $barang->id_barang,
                        'jenis' => 'masuk',
                        'jumlah' => $detail->jumlah,
                        'stok_sebelum' => $stokSebelum,
                        'stok_sesudah' => $stokSesudah,
                        'referensi' => $transaksi->no_transaksi,
                        'keterangan' => "Pembatalan Transaksi ({$transaksi->no_transaksi})",
                        'id_user' => $user->id_user,
                        'created_at' => now(),
                    ]);
                }
            }

            $transaksi->update(['status' => 'batal']);

            return $transaksi->fresh([
                'pelanggan',
                'kasir',
                'detailTransaksi.barang',
            ]);
        });
    }
}
