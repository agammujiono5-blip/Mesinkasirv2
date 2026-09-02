<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transaksi', function (Blueprint $table) {
            $table->id('id_transaksi');
            $table->string('no_transaksi', 30)->unique();
            $table->foreignId('id_pelanggan')->nullable()->constrained('users', 'id_user')->nullOnDelete();
            $table->foreignId('id_kasir')->constrained('users', 'id_user')->cascadeOnDelete();
            $table->dateTime('tanggal');
            $table->decimal('total_harga', 14, 2)->default(0);
            $table->enum('metode_bayar', ['cash', 'transfer', 'qris', 'debit', 'kredit']);
            $table->enum('status', ['pending', 'selesai', 'batal'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transaksi');
    }
};
