# Werewolf Multiplayer Online

Game Werewolf multiplayer realtime dengan tema **Midnight Gothic**. Dibangun dengan Next.js (App Router), TypeScript strict, Tailwind CSS, PostgreSQL + Prisma, Zod, dan Pusher (opsional).

> **PERINGATAN KEAMANAN:** kredensial owner di `.env.example` (`dafa` / `owner`) hanya untuk **development**. Jangan pernah dipakai di production. Seed menolak berjalan di production bila `OWNER_PASSWORD` adalah `owner` atau kurang dari 12 karakter.

## Instalasi

Butuh Node.js 20+ dan PostgreSQL 14+.

```bash
npm install
cp .env.example .env      # lalu isi nilainya
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Perintah lain: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test`.

> Catatan versi: proyek ini memakai Next.js 15 (stabil, tervalidasi saat dibuat). Upgrade ke versi lebih baru cukup dengan `npm install next@latest` lalu perbaiki peringatan deprecation (mis. `middleware` -> `proxy` pada Next 16).

## Environment

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Koneksi PostgreSQL. Lokal: isi keduanya sama. Di Supabase/Neon: `DATABASE_URL` = pooler, `DIRECT_URL` = koneksi langsung (untuk migrasi). |
| `AUTH_SECRET` | Minimal 32 karakter acak (`openssl rand -base64 48`). Dipakai untuk HMAC hash token sesi. |
| `NEXT_PUBLIC_APP_URL` | URL publik aplikasi. |
| `OWNER_USERNAME`, `OWNER_PASSWORD` | Akun owner untuk seed (password di-hash bcrypt, tidak disimpan plaintext). |
| `REALTIME_PROVIDER` | `none` (polling saja) atau `pusher`. |
| `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` | Kredensial Pusher Channels bila `REALTIME_PROVIDER=pusher`. |
| `REALTIME_URL`, `REALTIME_SECRET` | Slot cadangan untuk adapter provider lain (tidak dipakai oleh adapter Pusher). |
| `CRON_SECRET` | Token untuk `/api/games/tick` (opsional). |
| `NEXT_PUBLIC_AD_DOMAIN` | Opsional, disediakan untuk integrasi iklan. |

`.env` sudah masuk `.gitignore`. Jangan commit secret.

## Setup PostgreSQL

```bash
createdb werewolf
# DATABASE_URL=postgresql://user:pass@localhost:5432/werewolf
```

Prisma: `npx prisma generate` (otomatis lewat `postinstall`), `npx prisma migrate dev` (development), `npx prisma migrate deploy` (production), `npm run db:seed` (membuat/menyegarkan akun owner).

## Autentikasi

- Register: username (huruf kecil/angka/underscore, 3-20), password kuat (8+ karakter, huruf besar, kecil, angka), konfirmasi password. Divalidasi dengan Zod.
- Password di-hash dengan **bcrypt (cost 12)**.
- Sesi: token acak 256-bit di cookie **HTTP-only**, `SameSite=Lax`, `Secure` di production. Database hanya menyimpan hash HMAC token. Tidak ada token/password di localStorage.
- Sesi punya masa berlaku, bisa dicabut (logout, akun dinonaktifkan), dan dirotasi (`GET /api/auth/me`).
- CSRF: cookie SameSite + verifikasi header `Origin` pada semua request yang mengubah data.
- Rate limiting berbasis PostgreSQL (atomik, aman untuk serverless).

## Owner

Panel tersembunyi di `/owner/login` dan `/owner/dashboard`. Tidak ada tautan ke route ini di mana pun (navbar, footer, landing, lobby, profil, sitemap).

- Autentikasi owner terpisah (cookie `ww_owner`, `SameSite=Strict`, sesi lebih pendek) dan wajib role `OWNER`.
- Middleware + otorisasi server. User biasa yang membuka `/owner/dashboard` mendapat **403 FORBIDDEN**.
- Fitur: statistik, cari user, aktif/nonaktifkan akun, lihat room, akhiri room rusak, hapus room terbengkalai (riwayat match tidak ikut terhapus), status sistem, audit log (tanpa password/token).

## Aturan game

Alur fase: `STARTING` -> `ROLE_REVEAL` (10 dtk) -> `NIGHT` (60) -> `DAY` (60) -> `DISCUSSION` (120) -> `VOTING` (30) -> `RESULT` -> `NIGHT` ... sampai ada pemenang (`FINISHED`). `ROLE_ACTION` dipakai untuk tembakan terakhir Pemburu. Durasi bisa diubah host per room.

- **Timer server-authoritative.** Server menyimpan `phaseEndsAt`; client hanya menampilkan hitung mundur. Fase dimajukan secara lazy oleh server (saat ada request) dengan lock optimistik (`phaseVersion`), sehingga aman untuk serverless dan konkuren. Cron opsional: `/api/games/tick`.
- **Voting:** tiap pemain hidup 1 suara (divalidasi server: voter hidup, target hidup, game sama, fase benar, belum vote). Seri -> voting ulang sekali; tetap seri -> tidak ada yang digantung. Fase voting berakhir lebih awal bila semua sudah memilih.
- **Malam:** pipeline `COLLECT -> LOCK -> VALIDATE -> RESOLVE CONFLICTS -> APPLY EFFECTS -> DEATH RESOLUTION -> WIN CHECK` di `lib/game/engine/resolution.ts` (`GameResolutionEngine`, murni dan deterministik, tanpa React/UI/realtime).
- **Konflik:** Attack + Protect = selamat; Attack + Heal = selamat; Poison + Protect = mati; Heal + Poison pada target sama = Poison menang; Hunter diproses setelah death resolution pertama; Lovers chain setelah semua kill utama.
- **Kemenangan:** Desa menang jika semua serigala (dan tim solo) mati. Serigala menang saat paritas (mode Klasik) atau mayoritas (mode Mayoritas). Solo menang sebagai last survivor. Lovers lintas tim bisa menang bila opsi diaktifkan. Batas ronde mencegah game buntu (seri).

### Role

Inti: **Serigala**, **Warga Desa**, **Penjaga** (tidak boleh melindungi diri secara default), **Penyihir** (heal dan poison, masing-masing 1x), **Peramal** (hasil tim, hanya untuk Peramal).
Tambahan (aktif hanya jika host memasukkannya ke komposisi): **Pemburu**, **Cupid** (+Lovers), **Dokter** (tidak boleh target sama berturut-turut, self-protect configurable), **Pembunuh Berantai**, **Pembakar**, **Pelacak**, **Medium**.

Menambah role baru: buat `RoleDef` di `lib/roles/` dan daftarkan di `lib/roles/registry.ts`. Selama memakai jenis ability yang sudah ada (`ATTACK`, `PROTECT`, `HEAL`, `POISON`, `INSPECT`, `TRACK`, `LINK`, `KILL`, `DOUSE`, `IGNITE`, `REVENGE_KILL`) engine tidak perlu diubah. Tambahkan juga ID role di `lib/game/constants.ts` dan enum `RoleType` di Prisma (butuh migrasi).

Komposisi role divalidasi server: total = `maxPlayers`, minimal 1 serigala. Bila pemain yang bergabung kurang dari maksimum, Warga Desa dikurangi lebih dulu.

## Spectator mode

- Spectator bukan pemain: tanpa role, aksi, vote, atau chat PUBLIC/WEREWOLF/ROLE. Hanya melihat papan, fase, timer, daftar pemain, status hidup/mati, dan hasil voting.
- **Tidak ada data rahasia ke spectator.** State dibangun per-viewer di server (`lib/game/view.ts`): role pemain lain, daftar serigala, hasil Peramal, info Penyihir, dan chat privat tidak pernah disertakan. Event realtime hanya sinyal tanpa data rahasia; channel privat memakai channel per-user yang diotorisasi server.
- Bisa masuk saat room `STARTING`/`IN_PROGRESS` (atau `WAITING` yang sudah penuh), bisa keluar kapan saja tanpa memengaruhi game. Jumlah spectator tampil di header. Host bisa menonaktifkan lewat `allowSpectators`.
- Spectator punya channel chat sendiri (`SPECTATOR`) yang tidak terlihat pemain.

## Aturan join/leave room dan lobby

| Status room | Aksi di lobby |
|---|---|
| `WAITING` dan pemain < maks | **JOIN** |
| `WAITING` dan penuh | **SPECTATE** |
| `STARTING` / `IN_PROGRESS` | **SPECTATE** (tidak bisa join sebagai pemain) |
| `FINISHED` | Hanya lihat **hasil match** |
| `CLOSED` | Badge **CLOSED** (tidak bisa join/spectate) |
| `PRIVATE` | Tidak tampil di lobby; hanya lewat Room ID |

Semua aturan divalidasi di server (`lib/rooms/rules.ts`, `lib/rooms/service.ts`). Satu pemain hanya boleh berada di satu room aktif. Jika host keluar saat `WAITING`, host dipindahkan ke pemain tertua; jika kosong, room ditutup. Pemain tidak bisa keluar saat game berlangsung. Kapasitas dijaga dengan `SELECT ... FOR UPDATE` pada baris room.

Host dapat mengubah `maxPlayers`, komposisi role, mode, dan visibilitas **selama room `WAITING` dan belum pernah dimulai**. Room ID berformat `WOLF-7X9K2`, digenerate server-side.

## Realtime

Abstraksi provider di `lib/realtime/` (`RealtimeProvider`). Implementasi: Pusher Channels dan `none`.

- Event bertipe di `types/realtime.ts` (`room:player_joined`, `game:phase_changed`, `chat:message`, dst.).
- Event hanya sinyal; client mengambil ulang state yang sudah difilter server. Karena itu game tetap benar walau realtime mati: client otomatis polling (2-5 detik).
- Reconnect: server adalah source of truth; pemain yang kembali dengan sesi valid langsung mendapat state terbaru. Tidak ada state game di React.

Setup Pusher: buat app di pusher.com, isi `REALTIME_PROVIDER=pusher`, `PUSHER_APP_ID/KEY/SECRET/CLUSTER`, dan `NEXT_PUBLIC_PUSHER_KEY/CLUSTER`.

## Pengujian

```bash
npm run test
```

Vitest mencakup engine (konflik, win condition, Lovers, Hunter, tally voting), komposisi role, aturan join/spectate, permission chat, sanitasi, dan validasi Zod.

## Build production

```bash
npm run build
npm run start
```

## Deploy ke Vercel

1. Buat database PostgreSQL (Neon/Supabase/Vercel Postgres). Isi `DATABASE_URL` (pooler) dan `DIRECT_URL`.
2. Import repo ke Vercel, isi semua environment variable (set `REALTIME_PROVIDER=pusher` untuk pengalaman realtime penuh).
3. Jalankan migrasi dari mesin lokal: `DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy`.
4. Seed owner dengan **password kuat**: `OWNER_USERNAME=... OWNER_PASSWORD=... NODE_ENV=production npm run db:seed`.
5. Opsional: set `CRON_SECRET`; `vercel.json` memanggil `/api/games/tick` sebagai pengaman fase jatuh tempo (jadwal harian untuk plan Hobby; permainan aktif tetap dimajukan oleh polling pemain).

## Domain kustom

Vercel -> Project -> Settings -> Domains -> tambahkan domain, atur DNS sesuai petunjuk, lalu perbarui `NEXT_PUBLIC_APP_URL`. Cookie `Secure` otomatis aktif di production (wajib HTTPS).

## Troubleshooting

- `Konfigurasi environment tidak valid`: periksa `AUTH_SECRET` (min 32 karakter) dan `DATABASE_URL`.
- `P1001 Can't reach database`: pastikan PostgreSQL berjalan dan URL benar.
- Tabel tidak ada: jalankan `npx prisma migrate dev`.
- Tidak bisa login owner: jalankan `npm run db:seed` lagi.
- Realtime tidak jalan: periksa kredensial Pusher dan prefix `NEXT_PUBLIC_`; aplikasi tetap berfungsi lewat polling.
- Terkena `RATE_LIMITED`: tunggu sesuai header `Retry-After`.
- Login gagal di production: pastikan situs diakses lewat HTTPS.

## Catatan keamanan

- Server tidak mempercayai data client; semua aksi game, voting, chat, dan owner divalidasi di server.
- Respons error terstruktur `{ success:false, error:{ code, message } }`; stack trace tidak pernah dikirim.
- Chat disanitasi (hapus tag HTML, karakter kontrol/bidi) dan dibatasi laju; React meng-escape output (XSS).
- Prisma mencegah SQL injection; raw SQL hanya memakai parameter ter-bind.
- Header keamanan (HSTS, X-Frame-Options, nosniff, dll.) diatur di `next.config.ts`; `/owner/*` diberi `noindex` dan `no-store`.
- Password hash, token sesi, dan secret environment tidak pernah dikirim ke client.
- Ganti semua kredensial development sebelum production.
