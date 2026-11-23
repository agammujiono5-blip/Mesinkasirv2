import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan kelas Tailwind dengan aman.
 *
 * `clsx` menyusun kelas kondisional, lalu `twMerge` membuang kelas yang
 * saling bertabrakan (mis. `px-2` + `px-4` -> `px-4`) sehingga kelas dari
 * props pemanggil selalu menang atas kelas bawaan komponen.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
