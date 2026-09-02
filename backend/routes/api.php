<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DiskonController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\PembelianController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\StokLogController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\TransaksiController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Protected Routes (Sanctum Authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Auth & Profile
    Route::prefix('auth')->group(function () {
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Dashboard Analytics (Admin, Owner, Manager, Kasir)
    Route::prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/chart', [DashboardController::class, 'chart']);
    });

    // Users Management (Admin, Owner)
    Route::middleware('role:admin,owner')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    // Kategori
    Route::get('/kategori', [KategoriController::class, 'index']);
    Route::get('/kategori/{id}', [KategoriController::class, 'show']);
    Route::middleware('role:admin,owner,manager')->group(function () {
        Route::post('/kategori', [KategoriController::class, 'store']);
        Route::put('/kategori/{id}', [KategoriController::class, 'update']);
        Route::delete('/kategori/{id}', [KategoriController::class, 'destroy']);
    });

    // Supplier
    Route::get('/supplier', [SupplierController::class, 'index']);
    Route::get('/supplier/{id}', [SupplierController::class, 'show']);
    Route::middleware('role:admin,owner,manager')->group(function () {
        Route::post('/supplier', [SupplierController::class, 'store']);
        Route::put('/supplier/{id}', [SupplierController::class, 'update']);
        Route::delete('/supplier/{id}', [SupplierController::class, 'destroy']);
    });

    // Barang
    Route::get('/barang/stok-minimum', [BarangController::class, 'stokMinimum']);
    Route::get('/barang', [BarangController::class, 'index']);
    Route::get('/barang/{id}', [BarangController::class, 'show']);
    Route::middleware('role:admin,owner,manager')->group(function () {
        Route::post('/barang', [BarangController::class, 'store']);
        Route::post('/barang/{id}', [BarangController::class, 'update']);
        Route::put('/barang/{id}', [BarangController::class, 'update']);
        Route::delete('/barang/{id}', [BarangController::class, 'destroy']);
    });

    // Diskon
    Route::get('/diskon/aktif', [DiskonController::class, 'diskonAktif']);
    Route::get('/diskon', [DiskonController::class, 'index']);
    Route::get('/diskon/{id}', [DiskonController::class, 'show']);
    Route::middleware('role:admin,owner,manager')->group(function () {
        Route::post('/diskon', [DiskonController::class, 'store']);
        Route::put('/diskon/{id}', [DiskonController::class, 'update']);
        Route::delete('/diskon/{id}', [DiskonController::class, 'destroy']);
    });

    // Transaksi (Kasir, Admin, Owner)
    Route::get('/transaksi', [TransaksiController::class, 'index']);
    Route::post('/transaksi', [TransaksiController::class, 'store']);
    Route::get('/transaksi/{id}', [TransaksiController::class, 'show']);
    Route::post('/transaksi/{id}/batal', [TransaksiController::class, 'cancel']);

    // Pembelian / Restok (Admin, Owner, Manager)
    Route::middleware('role:admin,owner,manager')->group(function () {
        Route::get('/pembelian', [PembelianController::class, 'index']);
        Route::post('/pembelian', [PembelianController::class, 'store']);
        Route::get('/pembelian/{id}', [PembelianController::class, 'show']);
    });

    // Stok Log & Penyesuaian
    Route::get('/stok-log', [StokLogController::class, 'index']);
    Route::middleware('role:admin,owner,manager')->group(function () {
        Route::post('/stok-log/penyesuaian', [StokLogController::class, 'penyesuaian']);
    });

    // Permissions & Roles
    Route::middleware('role:admin,owner')->group(function () {
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::get('/permissions/role/{role}', [PermissionController::class, 'getByRole']);
        Route::post('/permissions/sync', [PermissionController::class, 'sync']);
    });
});
