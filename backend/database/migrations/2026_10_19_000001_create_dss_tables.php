<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel DSS bersifat additive: tidak mengubah / menghapus tabel TPS, OAS, KMS, maupun MIS.
     */
    public function up(): void
    {
        Schema::create('dss_kriteria', function (Blueprint $table) {
            $table->id('id_kriteria');
            $table->string('kode_kriteria', 10)->unique();
            $table->string('nama_kriteria', 100);
            $table->string('deskripsi', 255)->nullable();
            $table->enum('jenis', ['benefit', 'cost'])->default('benefit');
            $table->decimal('bobot', 5, 2)->default(0);
            $table->string('satuan', 30)->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });

        Schema::create('dss_analisis', function (Blueprint $table) {
            $table->id('id_analisis');
            $table->string('kode_analisis', 30)->unique();
            $table->string('judul', 150);
            $table->string('metode', 20)->default('SAW');
            $table->string('periode', 20)->default('all_time');
            $table->date('periode_awal')->nullable();
            $table->date('periode_akhir')->nullable();
            $table->unsignedInteger('total_alternatif')->default(0);
            $table->unsignedInteger('total_kriteria')->default(0);
            $table->json('kriteria_json')->nullable();
            $table->json('bobot_json')->nullable();
            $table->json('sumber_data_json')->nullable();
            $table->string('alternatif_terbaik', 150)->nullable();
            $table->decimal('skor_tertinggi', 8, 6)->default(0);
            $table->string('status', 20)->default('selesai');
            $table->text('catatan')->nullable();
            $table->foreignId('id_user')->nullable()->constrained('users', 'id_user')->nullOnDelete();
            $table->timestamps();

            $table->index(['periode', 'created_at']);
        });

        Schema::create('dss_hasil_alternatif', function (Blueprint $table) {
            $table->id('id_hasil');
            $table->foreignId('id_analisis')->constrained('dss_analisis', 'id_analisis')->cascadeOnDelete();
            $table->foreignId('id_barang')->nullable()->constrained('barang', 'id_barang')->nullOnDelete();
            $table->string('kode_alternatif', 30);
            $table->string('nama_alternatif', 150);
            $table->json('nilai_json')->nullable();
            $table->json('normalisasi_json')->nullable();
            $table->decimal('skor', 8, 6)->default(0);
            $table->unsignedInteger('peringkat')->default(0);
            $table->text('rekomendasi')->nullable();
            $table->timestamps();

            $table->index(['id_analisis', 'peringkat']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dss_hasil_alternatif');
        Schema::dropIfExists('dss_analisis');
        Schema::dropIfExists('dss_kriteria');
    }
};
