<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel pendukung modul MIS (KMS, analitik penjualan, laporan, rekomendasi restok).
     *
     * Bersifat additive: pada database yang tabelnya sudah ada (mis. dibuat manual
     * sebelumnya), migrasi ini tidak melakukan apa pun.
     */
    public function up(): void
    {
        if (! Schema::hasTable('knowledge_base')) {
            Schema::create('knowledge_base', function (Blueprint $table) {
                $table->id('id_knowledge');
                $table->string('judul', 150);
                $table->enum('kategori', ['SOP', 'Tips', 'Troubleshooting', 'Kebijakan']);
                $table->text('isi');
                $table->foreignId('dibuat_oleh')->nullable()->constrained('users', 'id_user');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('analisis_penjualan')) {
            Schema::create('analisis_penjualan', function (Blueprint $table) {
                $table->id('id_analisis');
                $table->date('periode');
                $table->foreignId('id_barang')->constrained('barang', 'id_barang');
                $table->integer('total_terjual')->default(0);
                $table->decimal('total_pendapatan', 14, 2)->default(0);
                $table->integer('ranking_terlaris')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('rekomendasi_restock')) {
            Schema::create('rekomendasi_restock', function (Blueprint $table) {
                $table->id('id_rekomendasi');
                $table->foreignId('id_barang')->constrained('barang', 'id_barang');
                $table->integer('stok_saat_ini');
                $table->integer('stok_minimum');
                $table->integer('jumlah_disarankan');
                $table->string('status', 50)->default('Belum Ditindak');
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('laporan_manajemen')) {
            Schema::create('laporan_manajemen', function (Blueprint $table) {
                $table->id('id_laporan');
                $table->string('judul_laporan', 150);
                $table->enum('jenis', ['Penjualan', 'Pembelian', 'Stok', 'Keuangan']);
                $table->date('periode_awal');
                $table->date('periode_akhir');
                $table->text('ringkasan');
                $table->foreignId('dibuat_oleh')->nullable()->constrained('users', 'id_user');
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laporan_manajemen');
        Schema::dropIfExists('rekomendasi_restock');
        Schema::dropIfExists('analisis_penjualan');
        Schema::dropIfExists('knowledge_base');
    }
};
