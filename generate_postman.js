const fs = require('fs');
const path = require('path');

const collection = {
  info: {
    name: "POS & Inventory API (Tugas SIM)",
    _postman_id: "c8f9b1d2-e547-49f3-8b7a-1290384756ab",
    description: "Koleksi lengkap Postman API untuk Sistem Manajemen Kasir & Inventaris Toko (Laravel Sanctum REST API).\n\nFitur otomatis:\n- Saat melakukan Login, token Sanctum otomatis tersimpan di variable `{{token}}`.\n- Semua endpoint terproteksi otomatis menggunakan Bearer Token dari variable `{{token}}`.\n- Base URL diset ke variable `{{base_url}}` (default: http://127.0.0.1:8000/api).",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    {
      key: "base_url",
      value: "http://127.0.0.1:8000/api",
      type: "string"
    },
    {
      key: "token",
      value: "",
      type: "string"
    }
  ],
  auth: {
    type: "bearer",
    bearer: [
      {
        key: "token",
        value: "{{token}}",
        type: "string"
      }
    ]
  },
  item: [
    {
      name: "01. Auth",
      item: [
        {
          name: "Login - Admin (Auto Save Token)",
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "if (pm.response.code === 200) {",
                  "    var json = pm.response.json();",
                  "    if (json.data && json.data.token) {",
                  "        pm.collectionVariables.set('token', json.data.token);",
                  "        console.log('Sanctum Token tersimpan otomatis ke collection variable!');",
                  "    }",
                  "}"
                ],
                type: "text/javascript"
              }
            }
          ],
          request: {
            auth: { type: "noauth" },
            method: "POST",
            header: [
              { key: "Accept", value: "application/json", type: "text" },
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                identifier: "admin",
                password: "password123"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/login",
              host: ["{{base_url}}"],
              path: ["auth", "login"]
            },
            description: "Login sebagai Admin. Token otomatis tersimpan ke variable {{token}}."
          }
        },
        {
          name: "Login - Kasir",
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "if (pm.response.code === 200) {",
                  "    var json = pm.response.json();",
                  "    if (json.data && json.data.token) {",
                  "        pm.collectionVariables.set('token', json.data.token);",
                  "        console.log('Sanctum Token Kasir tersimpan otomatis!');",
                  "    }",
                  "}"
                ],
                type: "text/javascript"
              }
            }
          ],
          request: {
            auth: { type: "noauth" },
            method: "POST",
            header: [
              { key: "Accept", value: "application/json", type: "text" },
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                identifier: "kasir1",
                password: "password123"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/login",
              host: ["{{base_url}}"],
              path: ["auth", "login"]
            }
          }
        },
        {
          name: "Register User Baru",
          request: {
            auth: { type: "noauth" },
            method: "POST",
            header: [
              { key: "Accept", value: "application/json", type: "text" },
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama: "Kasir Baru",
                username: "kasir2",
                email: "kasir2@pos.local",
                password: "password123",
                password_confirmation: "password123",
                no_hp: "081234567899",
                alamat: "Jl. Kasir No. 2",
                role: "kasir"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/register",
              host: ["{{base_url}}"],
              path: ["auth", "register"]
            }
          }
        },
        {
          name: "Get User Profile",
          request: {
            method: "GET",
            header: [
              { key: "Accept", value: "application/json", type: "text" }
            ],
            url: {
              raw: "{{base_url}}/auth/profile",
              host: ["{{base_url}}"],
              path: ["auth", "profile"]
            }
          }
        },
        {
          name: "Update Profile",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json", type: "text" },
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama: "Administrator POS Update",
                email: "admin@pos.local",
                no_hp: "081234567890",
                alamat: "Kantor Pusat Lantai 2"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/profile",
              host: ["{{base_url}}"],
              path: ["auth", "profile"]
            }
          }
        },
        {
          name: "Change Password",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json", type: "text" },
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                current_password: "password123",
                new_password: "password123",
                new_password_confirmation: "password123"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/auth/change-password",
              host: ["{{base_url}}"],
              path: ["auth", "change-password"]
            }
          }
        },
        {
          name: "Logout",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json", type: "text" }
            ],
            url: {
              raw: "{{base_url}}/auth/logout",
              host: ["{{base_url}}"],
              path: ["auth", "logout"]
            }
          }
        }
      ]
    },
    {
      name: "02. Dashboard",
      item: [
        {
          name: "Get Dashboard Stats",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/dashboard/stats",
              host: ["{{base_url}}"],
              path: ["dashboard", "stats"]
            }
          }
        },
        {
          name: "Get Dashboard Chart",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/dashboard/chart?range=7days",
              host: ["{{base_url}}"],
              path: ["dashboard", "chart"],
              query: [{ key: "range", value: "7days" }]
            }
          }
        }
      ]
    },
    {
      name: "03. Users Management (Admin)",
      item: [
        {
          name: "Get All Users",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/users?per_page=15",
              host: ["{{base_url}}"],
              path: ["users"],
              query: [{ key: "per_page", value: "15" }]
            }
          }
        },
        {
          name: "Create User",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama: "Staff Gudang",
                username: "gudang1",
                email: "gudang@pos.local",
                password: "password123",
                no_hp: "081299998888",
                alamat: "Gudang Utama",
                role: "manager",
                status: "aktif"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/users",
              host: ["{{base_url}}"],
              path: ["users"]
            }
          }
        },
        {
          name: "Get User by ID",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/users/1",
              host: ["{{base_url}}"],
              path: ["users", "1"]
            }
          }
        },
        {
          name: "Update User",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama: "Staff Gudang Updated",
                email: "gudang@pos.local",
                no_hp: "081299998889",
                alamat: "Gudang Baru",
                role: "manager",
                status: "aktif"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/users/2",
              host: ["{{base_url}}"],
              path: ["users", "2"]
            }
          }
        },
        {
          name: "Delete User",
          request: {
            method: "DELETE",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/users/3",
              host: ["{{base_url}}"],
              path: ["users", "3"]
            }
          }
        }
      ]
    },
    {
      name: "04. Kategori",
      item: [
        {
          name: "Get All Kategori",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/kategori",
              host: ["{{base_url}}"],
              path: ["kategori"]
            }
          }
        },
        {
          name: "Create Kategori",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama_kategori: "Snack & Minuman",
                deskripsi: "Kategori produk makanan ringan dan minuman kemasan"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/kategori",
              host: ["{{base_url}}"],
              path: ["kategori"]
            }
          }
        },
        {
          name: "Get Kategori by ID",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/kategori/1",
              host: ["{{base_url}}"],
              path: ["kategori", "1"]
            }
          }
        },
        {
          name: "Update Kategori",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama_kategori: "Makanan Ringan",
                deskripsi: "Berbagai aneka camilan dan snack gurih"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/kategori/1",
              host: ["{{base_url}}"],
              path: ["kategori", "1"]
            }
          }
        },
        {
          name: "Delete Kategori",
          request: {
            method: "DELETE",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/kategori/1",
              host: ["{{base_url}}"],
              path: ["kategori", "1"]
            }
          }
        }
      ]
    },
    {
      name: "05. Supplier",
      item: [
        {
          name: "Get All Supplier",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/supplier",
              host: ["{{base_url}}"],
              path: ["supplier"]
            }
          }
        },
        {
          name: "Create Supplier",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama_supplier: "PT Distribusi Nusantara",
                kontak_person: "Bapak Hendra",
                telepon: "021-5551234",
                email: "kontak@distribusinusantara.co.id",
                alamat: "Kawasan Industri Pulo Gadung, Jakarta"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/supplier",
              host: ["{{base_url}}"],
              path: ["supplier"]
            }
          }
        },
        {
          name: "Get Supplier by ID",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/supplier/1",
              host: ["{{base_url}}"],
              path: ["supplier", "1"]
            }
          }
        },
        {
          name: "Update Supplier",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama_supplier: "PT Distribusi Nusantara Perkasa",
                kontak_person: "Bapak Hendra W.",
                telepon: "021-5559999",
                email: "sales@distribusinusantara.co.id",
                alamat: "Kawasan Industri Pulo Gadung Blok B4, Jakarta"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/supplier/1",
              host: ["{{base_url}}"],
              path: ["supplier", "1"]
            }
          }
        },
        {
          name: "Delete Supplier",
          request: {
            method: "DELETE",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/supplier/1",
              host: ["{{base_url}}"],
              path: ["supplier", "1"]
            }
          }
        }
      ]
    },
    {
      name: "06. Barang (Inventaris)",
      item: [
        {
          name: "Get All Barang",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/barang?search=&per_page=15",
              host: ["{{base_url}}"],
              path: ["barang"],
              query: [
                { key: "search", value: "" },
                { key: "per_page", value: "15" },
                { key: "id_kategori", value: "", disabled: true },
                { key: "stok_menipis", value: "1", disabled: true }
              ]
            }
          }
        },
        {
          name: "Get Stok Minimum (Peringatan Stok Menipis)",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/barang/stok-minimum",
              host: ["{{base_url}}"],
              path: ["barang", "stok-minimum"]
            }
          }
        },
        {
          name: "Create Barang",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                kode_barang: "BRG-00100",
                id_kategori: 1,
                id_supplier: 1,
                nama_barang: "Kopi Arabika 250g",
                deskripsi: "Biji kopi sangrai pilihan",
                harga_beli: 45000,
                harga_jual: 65000,
                stok: 50,
                stok_minimum: 10,
                satuan: "pcs"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/barang",
              host: ["{{base_url}}"],
              path: ["barang"]
            }
          }
        },
        {
          name: "Get Barang by ID",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/barang/1",
              host: ["{{base_url}}"],
              path: ["barang", "1"]
            }
          }
        },
        {
          name: "Update Barang",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                id_kategori: 1,
                id_supplier: 1,
                nama_barang: "Kopi Arabika Premium 250g",
                deskripsi: "Biji kopi sangrai grade 1",
                harga_beli: 48000,
                harga_jual: 70000,
                stok: 45,
                stok_minimum: 10,
                satuan: "pcs"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/barang/1",
              host: ["{{base_url}}"],
              path: ["barang", "1"]
            }
          }
        },
        {
          name: "Delete Barang",
          request: {
            method: "DELETE",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/barang/1",
              host: ["{{base_url}}"],
              path: ["barang", "1"]
            }
          }
        }
      ]
    },
    {
      name: "07. Diskon",
      item: [
        {
          name: "Get All Diskon",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/diskon",
              host: ["{{base_url}}"],
              path: ["diskon"]
            }
          }
        },
        {
          name: "Get Diskon Aktif",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/diskon/aktif",
              host: ["{{base_url}}"],
              path: ["diskon", "aktif"]
            }
          }
        },
        {
          name: "Create Diskon",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama_diskon: "Promo Gajian 10%",
                tipe: "persen",
                nilai: 10,
                id_barang: null,
                tanggal_mulai: "2026-01-01",
                tanggal_selesai: "2026-12-31",
                status: "aktif"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/diskon",
              host: ["{{base_url}}"],
              path: ["diskon"]
            }
          }
        },
        {
          name: "Get Diskon by ID",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/diskon/1",
              host: ["{{base_url}}"],
              path: ["diskon", "1"]
            }
          }
        },
        {
          name: "Update Diskon",
          request: {
            method: "PUT",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nama_diskon: "Promo Flash Sale 15%",
                tipe: "persen",
                nilai: 15,
                tanggal_mulai: "2026-01-01",
                tanggal_selesai: "2026-12-31",
                status: "aktif"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/diskon/1",
              host: ["{{base_url}}"],
              path: ["diskon", "1"]
            }
          }
        },
        {
          name: "Delete Diskon",
          request: {
            method: "DELETE",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/diskon/1",
              host: ["{{base_url}}"],
              path: ["diskon", "1"]
            }
          }
        }
      ]
    },
    {
      name: "08. Transaksi (Penjualan Kasir)",
      item: [
        {
          name: "Get All Transaksi",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/transaksi?per_page=15",
              host: ["{{base_url}}"],
              path: ["transaksi"],
              query: [
                { key: "per_page", value: "15" },
                { key: "status", value: "selesai", disabled: true },
                { key: "metode_bayar", value: "qris", disabled: true }
              ]
            }
          }
        },
        {
          name: "Create Transaksi (Checkout POS)",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                id_pelanggan: null,
                metode_bayar: "cash",
                items: [
                  {
                    id_barang: 1,
                    jumlah: 2,
                    id_diskon: null
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/transaksi",
              host: ["{{base_url}}"],
              path: ["transaksi"]
            },
            description: "Membuat transaksi kasir. Stok barang akan otomatis berkurang dan tercatat di stok_log."
          }
        },
        {
          name: "Get Transaksi Detail",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/transaksi/1",
              host: ["{{base_url}}"],
              path: ["transaksi", "1"]
            }
          }
        },
        {
          name: "Batalkan Transaksi",
          request: {
            method: "POST",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/transaksi/1/batal",
              host: ["{{base_url}}"],
              path: ["transaksi", "1", "batal"]
            },
            description: "Membatalkan transaksi. Stok barang akan dikembalikan otomatis."
          }
        }
      ]
    },
    {
      name: "09. Pembelian (Restok dari Supplier)",
      item: [
        {
          name: "Get All Pembelian",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/pembelian?per_page=15",
              host: ["{{base_url}}"],
              path: ["pembelian"],
              query: [{ key: "per_page", value: "15" }]
            }
          }
        },
        {
          name: "Create Pembelian / Restok",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                id_supplier: 1,
                items: [
                  {
                    id_barang: 1,
                    jumlah: 20,
                    harga_beli_satuan: 45000
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/pembelian",
              host: ["{{base_url}}"],
              path: ["pembelian"]
            },
            description: "Mencatat pembelian restok barang. Stok barang akan otomatis bertambah."
          }
        },
        {
          name: "Get Pembelian Detail",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/pembelian/1",
              host: ["{{base_url}}"],
              path: ["pembelian", "1"]
            }
          }
        }
      ]
    },
    {
      name: "10. Stok Log & Opname",
      item: [
        {
          name: "Get Riwayat Stok Log",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/stok-log?per_page=20",
              host: ["{{base_url}}"],
              path: ["stok-log"],
              query: [
                { key: "per_page", value: "20" },
                { key: "id_barang", value: "1", disabled: true },
                { key: "jenis", value: "masuk", disabled: true }
              ]
            }
          }
        },
        {
          name: "Penyesuaian Stok (Stok Opname)",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                id_barang: 1,
                stok_baru: 60,
                referensi: "OPNAME-2026-01",
                keterangan: "Penyesuaian hasil opname fisik gudang"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/stok-log/penyesuaian",
              host: ["{{base_url}}"],
              path: ["stok-log", "penyesuaian"]
            }
          }
        }
      ]
    },
    {
      name: "11. Permissions & Roles (Admin/Owner)",
      item: [
        {
          name: "Get All Permissions",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/permissions",
              host: ["{{base_url}}"],
              path: ["permissions"]
            }
          }
        },
        {
          name: "Get Permissions by Role",
          request: {
            method: "GET",
            header: [{ key: "Accept", value: "application/json" }],
            url: {
              raw: "{{base_url}}/permissions/role/kasir",
              host: ["{{base_url}}"],
              path: ["permissions", "role", "kasir"]
            }
          }
        },
        {
          name: "Sync Permissions to Role",
          request: {
            method: "POST",
            header: [
              { key: "Accept", value: "application/json" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                role: "kasir",
                permission_ids: [6, 7, 10]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/permissions/sync",
              host: ["{{base_url}}"],
              path: ["permissions", "sync"]
            }
          }
        }
      ]
    }
  ]
};

const outputPath = path.join(__dirname, 'postman_collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf8');
console.log('Postman collection exported successfully to: ' + outputPath);
