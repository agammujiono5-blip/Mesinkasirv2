<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Otorisasi berbasis role.
 *
 * `role:admin,owner` mengizinkan minimal salah satu role tersebut.
 *
 * Pengguna nonaktif otomatis ditolak walau masih memegang token lama, sehingga
 * menonaktifkan akun langsung mencabut aksesnya tanpa menunggu token kedaluwarsa.
 */
class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->status !== 'aktif') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda sedang nonaktif. Silakan hubungi admin.',
            ], 403);
        }

        // Middleware di dalam grup menerima seluruh daftar sebagai satu
        // parameter ("admin,owner"), jadi nilai dipecah lagi di sini agar
        // `role:admin` dan `role:admin,owner` berperilaku sama.
        $izin = [];
        foreach ($roles as $role) {
            $izin = array_merge($izin, array_filter(array_map('trim', explode(',', $role))));
        }

        if ($izin !== [] && ! in_array($user->role, $izin, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Anda tidak memiliki izin untuk mengakses resource ini.',
            ], 403);
        }

        return $next($request);
    }
}
