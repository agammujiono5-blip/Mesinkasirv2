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
        Schema::create('pembelian', function (Blueprint $table) {
            $table->id('id_pembelian');
            $table->string('no_pembelian', 30)->unique();
            $table->foreignId('id_supplier')->constrained('supplier', 'id_supplier')->cascadeOnDelete();
            $table->foreignId('id_admin')->constrained('users', 'id_user')->cascadeOnDelete();
            $table->dateTime('tanggal');
            $table->decimal('total_harga', 14, 2)->default(0);
            $table->enum('status', ['pending', 'selesai', 'batal'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pembelian');
    }
};
