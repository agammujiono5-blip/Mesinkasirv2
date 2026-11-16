<?php

namespace Database\Factories;

use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Karyawan>
 */
class KaryawanFactory extends Factory
{
    protected $model = Karyawan::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nip' => 'KRY-'.fake()->unique()->numerify('####'),
            'nama_lengkap' => fake()->name(),
            'jenis_kelamin' => fake()->randomElement(Karyawan::JENIS_KELAMIN),
            'tempat_lahir' => fake()->city(),
            'tanggal_lahir' => fake()->dateTimeBetween('-45 years', '-20 years')->format('Y-m-d'),
            'alamat' => fake()->address(),
            'no_telepon' => fake()->numerify('08##########'),
            'email' => fake()->unique()->safeEmail(),
            'jabatan' => fake()->randomElement(['Staff', 'Supervisor', 'Kasir']),
            'divisi' => fake()->randomElement(['Operasional', 'Keuangan', 'Gudang']),
            'tanggal_masuk' => fake()->dateTimeBetween('-5 years', 'now')->format('Y-m-d'),
            'status_karyawan' => 'aktif',
            'foto' => null,
            'id_user' => null,
        ];
    }

    /**
     * Hubungkan karyawan dengan akun login user.
     */
    public function untukUser(User $user): static
    {
        return $this->state(fn (array $attributes): array => [
            'id_user' => $user->id_user,
            'nama_lengkap' => $user->nama,
            'email' => $user->email,
            'no_telepon' => $user->no_hp,
        ]);
    }

    public function nonaktif(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status_karyawan' => 'nonaktif',
        ]);
    }
}
