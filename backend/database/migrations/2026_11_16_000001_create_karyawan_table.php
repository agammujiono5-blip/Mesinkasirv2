<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel data kepegawaian.
     *
     * Kolom mengikuti skema MySQL yang diminta; kolom foto menyimpan path
     * berkas pada disk `public` sehingga tetap VARCHAR(255) di kedua dialek.
     */
    public function up(): void
    {
        Schema::create('karyawan', function (Blueprint $table) {
            $table->id('id_karyawan');
            $table->string('nip', 30)->nullable()->unique();
            $table->string('nama_lengkap', 150);
            $table->enum('jenis_kelamin', ['L', 'P'])->nullable();
            $table->string('tempat_lahir', 100)->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->text('alamat')->nullable();
            $table->string('no_telepon', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('jabatan', 100)->nullable();
            $table->string('divisi', 100)->nullable();
            $table->date('tanggal_masuk')->nullable();
            $table->enum('status_karyawan', ['aktif', 'nonaktif', 'cuti'])->default('aktif');
            // Nama file foto pada disk `public`, mis. karyawan/xxx.jpg
            $table->string('foto', 255)->nullable();
            // Akun login karyawan (diisi admin/owner). NULL = belum punya akun.
            $table->unsignedBigInteger('id_user')->nullable();
            $table->foreign('id_user')->references('id_user')->on('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status_karyawan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('karyawan');
    }
};
