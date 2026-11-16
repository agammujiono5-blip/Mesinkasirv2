<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel Expert System (Sistem Pakar) bersifat additive: tidak mengubah tabel
     * TPS, OAS, KMS, MIS, maupun DSS yang sudah ada.
     *
     * Alur knowledge base: es_kerusakan <- es_rule -> es_gejala
     * (rule = IF gejala AND gejala ... THEN kerusakan, dengan nilai Certainty Factor pakar).
     */
    public function up(): void
    {
        Schema::create('es_kerusakan', function (Blueprint $table) {
            $table->id('id_kerusakan');
            $table->string('kode_kerusakan', 10)->unique();
            $table->string('nama_kerusakan', 120);
            $table->string('kategori', 50)->default('stok');
            $table->text('deskripsi')->nullable();
            $table->text('solusi')->nullable();
            $table->string('tingkat_urgensi', 20)->default('sedang');
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });

        Schema::create('es_gejala', function (Blueprint $table) {
            $table->id('id_gejala');
            $table->string('kode_gejala', 10)->unique();
            $table->string('nama_gejala', 160);
            $table->string('kelompok', 50)->default('umum');
            $table->text('deskripsi')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });

        Schema::create('es_rule', function (Blueprint $table) {
            $table->id('id_rule');
            $table->string('kode_rule', 16)->unique();
            $table->string('kode_kerusakan', 10);
            $table->string('kode_gejala', 10);
            $table->decimal('cf_pakar', 4, 2)->default(1);
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->unique(['kode_kerusakan', 'kode_gejala']);
            $table->index(['kode_gejala', 'aktif']);
        });

        Schema::create('es_diagnosa', function (Blueprint $table) {
            $table->id('id_diagnosa');
            $table->string('kode_diagnosa', 24)->unique();
            $table->string('kode_kerusakan', 10)->nullable();
            $table->string('kategori', 50)->nullable();
            $table->decimal('cf_akhir', 5, 4)->default(0);
            $table->string('persentase', 12)->nullable();
            $table->string('tingkat_keyakinan', 30)->nullable();
            $table->string('hasil', 20)->nullable();
            $table->json('gejala_json')->nullable();
            $table->json('kerusakan_teridentifikasi_json')->nullable();
            $table->json('kandidat_json')->nullable();
            $table->json('langkah_inferensi_json')->nullable();
            $table->string('catatan', 255)->nullable();
            $table->foreignId('id_user')->nullable()->constrained('users', 'id_user')->nullOnDelete();
            $table->timestamps();

            $table->index(['kode_kerusakan', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('es_diagnosa');
        Schema::dropIfExists('es_rule');
        Schema::dropIfExists('es_gejala');
        Schema::dropIfExists('es_kerusakan');
    }
};
