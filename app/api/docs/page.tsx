import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Sky } from '@/components/layout/sky';
import { getCurrentUser } from '@/lib/auth/session';
import { Badge } from '@/components/ui/badge';
import { Terminal, Key, Shield, MessageSquare, Gamepad2, UserCheck, Flame, Bot } from 'lucide-react';

export const metadata = { title: 'Dokumentasi API & WhatsApp Bot' };

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  desc: string;
  auth: 'Public' | 'User' | 'Owner';
  body?: string;
  response?: string;
}

const ENDPOINTS: { group: string; icon: any; items: ApiEndpoint[] }[] = [
  {
    group: 'Autentikasi & Akun',
    icon: Key,
    items: [
      {
        method: 'POST',
        path: '/api/auth/guest',
        desc: 'Login instan tamu (Cocok untuk bot WA yang tidak perlu password). Mengembalikan cookie ww_session.',
        auth: 'Public',
        body: JSON.stringify({ nickname: 'BotWhatsApp' }, null, 2),
        response: JSON.stringify({ success: true, data: { user: { id: 'cmv...', username: 'botwhatsapp_abc1' }, isGuest: true, nickname: 'BotWhatsApp' } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        desc: 'Login akun terdaftar dengan username dan password.',
        auth: 'Public',
        body: JSON.stringify({ username: 'player1', password: 'password123', remember: true }, null, 2),
        response: JSON.stringify({ success: true, data: { user: { id: 'cmv...', username: 'player1' } } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/auth/register',
        desc: 'Pendaftaran akun baru permanen.',
        auth: 'Public',
        body: JSON.stringify({ username: 'player1', password: 'password123', confirmPassword: 'password123' }, null, 2),
        response: JSON.stringify({ success: true, data: { user: { id: 'cmv...', username: 'player1' } } }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        desc: 'Cek status sesi pengguna saat ini.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { user: { id: 'cmv...', username: 'player1' } } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        desc: 'Logout dan hapus sesi aktif.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { loggoutOut: true } }, null, 2),
      },
    ],
  },
  {
    group: 'Manajemen Room',
    icon: Gamepad2,
    items: [
      {
        method: 'GET',
        path: '/api/rooms',
        desc: 'Ambil daftar room publik yang sedang buka di lobi.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { rooms: [{ id: 'cmv...', code: 'WOLF-XYZ12', host: { username: 'host1' }, playerCount: 3, maxPlayers: 10, status: 'LOBBY' }] } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms',
        desc: 'Buat room baru. Mendukung room publik atau private dengan PIN/roomKey.',
        auth: 'User',
        body: JSON.stringify({ minPlayers: 5, maxPlayers: 10, gameMode: 'CLASSIC', visibility: 'PUBLIC', roomKey: '1234' }, null, 2),
        response: JSON.stringify({ success: true, data: { code: 'WOLF-XYZ12' } }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/rooms/:code',
        desc: 'Ambil detail status, daftar pemain, konfigurasi, dan peran di room.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { room: { code: 'WOLF-XYZ12', status: 'LOBBY', players: [{ user: { username: 'player1' }, ready: true, isHost: true }] } } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/join',
        desc: 'Gabung ke dalam room (kirim key jika room bersifat privat).',
        auth: 'User',
        body: JSON.stringify({ key: '1234' }, null, 2),
        response: JSON.stringify({ success: true, data: { joined: true, code: 'WOLF-XYZ12' } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/leave',
        desc: 'Keluar dari room saat ini.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { left: true } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/ready',
        desc: 'Setel status siap (ready toggle).',
        auth: 'User',
        body: JSON.stringify({ ready: true }, null, 2),
        response: JSON.stringify({ success: true, data: { ready: true } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/start',
        desc: 'Mulai permainan (Hanya bisa dipanggil oleh Host).',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { gameId: 'cmv.' } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/dismiss',
        desc: 'Host membubarkan room dan mengeluarkan seluruh pemain seketika.',
        auth: 'User',
        response: JSON.stringify({ success: true, message: 'Room berhasil dibubarkan oleh Host.' }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/spectate',
        desc: 'Masuk sebagai penonton pertandingan tanpa bermain.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { spectating: true } }, null, 2),
      },
    ],
  },
  {
    group: 'Siklus Game (Permainan & Aksi)',
    icon: Flame,
    items: [
      {
        method: 'GET',
        path: '/api/games/:id',
        desc: 'Ambil kondisi mutakhir permainan (fase malam/siang, timer, pemain hidup/mati). Role dirahasiakan sesuai hak akses.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { game: { id: 'cmv...', phase: 'NIGHT_WEREWOLF', dayNumber: 1, players: [{ id: 'p1', username: 'warga1', isAlive: true }] } } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/games/:id/action',
        desc: 'Kirim aksi kemampuan peran malam hari (Serigala bunuh, Dokter lindungi, Peramal intip).',
        auth: 'User',
        body: JSON.stringify({ type: 'WEREWOLF_KILL', targetId: 'cmv_user_target' }, null, 2),
        response: JSON.stringify({ success: true, data: { actionRecorded: true } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/games/:id/vote',
        desc: 'Kirim suara pemilihan gantung warga saat fase musyawarah siang.',
        auth: 'User',
        body: JSON.stringify({ targetId: 'cmv_user_suspect' }, null, 2),
        response: JSON.stringify({ success: true, data: { voted: true } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/chat',
        desc: 'Kirim pesan chat in-game (kanal PUBLIC saat siang atau WEREWOLF saat malam).',
        auth: 'User',
        body: JSON.stringify({ gameId: 'cmv_game_id', channel: 'PUBLIC', content: 'Aku yakin dia serigala' }, null, 2),
        response: JSON.stringify({ success: true, data: { message: { content: '...' } } }, null, 2),
      },
    ],
  },
  {
    group: 'Obrolan Lobi & Obrolan Room',
    icon: MessageSquare,
    items: [
      {
        method: 'GET',
        path: '/api/lobby/chat',
        desc: 'Ambil 40 pesan obrolan publik lobi utama.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { messages: [{ id: 'msg1', username: 'dapss', content: 'Halo semuanya!', createdAt: '2026-10-11T12:00:00Z'}] } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/lobby/chat',
        desc: 'Kirim pesan ke obrolan publik lobi.',
        auth: 'User',
        body: JSON.stringify({ content: 'Ayo main bareng guys!' }, null, 2),
        response: JSON.stringify({ success: true, data: { message: { id: '...', content: 'Ayo main bareng guys!' } } }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/rooms/:code/chat',
        desc: 'Ambil riwayat obrolan pemain khusus di dalam room tunggu.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { messages: [{ id: '...', username: 'player1', content: 'Ready gess' }] } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/rooms/:code/chat',
        desc: 'Kirim pesan chat khusus pemain di room tunggu.',
        auth: 'User',
        body: JSON.stringify({ content: 'Gas start min' }, null, 2),
        response: JSON.stringify({ success: true, data: { message: { id: '...', content: 'Gas start min' } } }, null, 2),
      },
    ],
  },
  {
    group: 'Profil, Teman & Match',
    icon: UserCheck,
    items: [
      {
        method: 'GET',
        path: '/api/profile/:username',
        desc: 'Ambil profil pemain, stats win/lose, gelar, bio, jumlah followers & koin.',
        auth: 'Public',
        response: JSON.stringify({ success: true, data: { profile: { username: 'dapss', title: 'Warga Senior', coins: 250, totalGames: 42, wins: 28, followersCount: 15 } } }, null, 2),
      },
      {
        method: 'PATCH',
        path: '/api/profile/me',
        desc: 'Perpbarui profil sendiri (bio, avatarUrl, bannerUrl, title).',
        auth: 'User',
        body: JSON.stringify({ bio: 'Suka peran pemburu', title: 'Penjaga Desa', avatarUrl: 'https://...', bannerUrl: 'https://...' }, null, 2),
        response: JSON.stringify({ success: true, data: { updated: true } }, null, 2),
      },
      {
        method: 'POST',
        path: '/api/followers/:username',
        desc: 'Ikuti (follow) pemain lain.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { following: true } }, null, 2),
      },
      {
        method: 'DELETE',
        path: '/api/followers/:username',
        desc: 'Berhenti mengikuti (unfollow) pemain.',
        auth: 'User',
        response: JSON.stringify({ success: true, data: { following: false } }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/matches?limit=10',
        desc: 'Dapatkan daftar riwayat pertandingan terakhir.',
        auth: 'Public',
        response: JSON.stringify({ success: true, data: { matches: [{ id: '...', winner: 'VILLAGERS', finishedAt: '...' }] } }, null, 2),
      },
    ],
  },
  {
    group: 'Owner & Diagnostik Sistem',
    icon: Shield,
    items: [
      {
        method: 'POST',
        path: '/api/owner/auth/login',
        desc: 'Login sesi owner.',
        auth: 'Public',
        body: JSON.stringify({ username: 'owner', password: 'secretpassword' }, null, 2),
      },
      {
        method: 'GET',
        path: '/api/owner/stats',
        desc: 'Statistik latency DB, koneksi Neon PostgreSQL, & performa server.',
        auth: 'Owner',
      },
      {
        method: 'POST',
        path: '/api/owner/test-room',
        desc: 'Simulasi bot otomatis untuk testing skenario game.',
        auth: 'Owner',
      },
      {
        method: 'POST',
        path: '/api/owner/rooms/delete-all',
        desc: 'Hapus dan bersihkan semua room aktif sekalgus.',
        auth: 'Owner',
      },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-gold-soft bg-gold/10 border-gold/30',
  DELETE: 'text-crimson-soft bg-crimson/10 border-crimson/30',
  PATCH: 'text-purple-soft bg-purple/10 border-purple/30',
};

export default async function ApiDocsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <Sky />
      <Navbar username={user?.username ?? null} />
      <main className="mx-auto max-w-5l px-4 py-10 pb-32">
        <div className="mb-10 space-y-4">
          <Badge tone="gold" className="w-fit">
            <Terminal className="h-3.5 w-3.5 mr-1" /> Werewolf REST API Reference v2.0
          </Badge>
          <h1 className="font-display text-4l sm:text-5l text-ink tracking-tight">Dokumentasi API & Integrasi Bot</h1>
          <p className="max-w-3l text-mute text-base leading-relaxed">
            Spesifikasi endpoint resmi Werewolf Online. Semua request dan response mengembalikan format JSON standar: {' '}
            <code className="text-gold-soft bg-white/5 px-2 py-0.5 rounded font-mono text-sm">
              {'{"uccess": true, "data": {...}}'}
            </code>
            .
          </p>
        </div>

        <div className="panel border-gold/30 bg-gold/5 p-6 mb-12 rounded-2l relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gold/20 text-gold-soft">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Panduan Khusus Bot WhatsApp / Node.js / Baileys</h2>
              <p className="text-x{ text-mute">Cara mudah mengintegrasikan bot WhatsApp ke server Werewolf</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-ink/90 leading-relaxed">
            <p>
              Untuk bot WhatsApp yang mempanggil API, cukup panggil { ' '}
              <strong className="text-gold-soft">POST /api/auth/guest</strong>; sekali saat bot mulai, lalu simpan cookie { ' '}
              <code className="bg-night/90 text-gold-soft px-1.5 py-0.5 rounded border border-white/10 font-mono text-xs">
                ww_session
              </code>{ ' '}
              untuk seluruh pemanggilan berikutnya:
            </p>

            <div className="rounded-xl bg-night/90 border border-white/10 p-4 font-mono text-xs overflow-x-auto text-emerald-300">
              <pre>{`// Contoh Integrasi di Bot WhatsApp (Node.js / Axios):
const axios = require('axios');

async function startBot() {
  // 1. Login Guest untuk mendapatkan sesi permainan
  const loginRes = await axios.post('https://werewolf.daps.biz.id/api/auth/guest', {
    nickname: 'WAPlayerBot'
  });

  // 2. Ambil cookie sesi dari response headers
  const cookies = loginRes.headers['set-cookie'];
  const sessionCookie = cookies.find(c => c.startsWith('ww_session='));

  // 3. Buat instance client dengan cookie sesi
  const api = axios.create({
    baseURL: 'https://werewolf.daps.biz.id',
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  });

  // Contoh: Buat room werewolf baru dari perintah WA '!boatroom'
  const newRoom = await api.post('/api/rooms', {
    minPlayers: 5,
    maxPlayers: 10,
    gameMode: 'CLASSIC',
    visibility: 'PUBLIC'
  });

  console.log('Room berhasil dibuat:', newRoom.data.data.code);
  // Output: WOLF-XXXXX
}`}</pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-gold-soft font-bold block mb-1">1. Autentikasi Cepat</span>
                <span className="text-x{ text-mute">Cukup sertakan header Cookie <code className="text-ink">ww_session=...</code> di tiap request.</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-emerald-400 font-bold block mb-1">2. Standar Respons JSON</span>
                <span className="text-xs text-mute">Setiap endpoint mengembalikan format konsisten bebas error HTML.</span>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="text-purple-soft font-bold block mb-1">3. Cepat & Anti-Lag</span>
                <span className="text-xs text-mute">Didukung koneksi Neon PostgreSEL Edge dengan latensi sangat rendah.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-10">
          {ENDPOINTS.map((cat) => {
            const Icon = cat.icon;
            return (
              <section key={cat.group} className="space-y-4">
                <h2 className="font-display text-xl text-gold-soft flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gold/10 border border-gold/20">
                    <Icon className="h-4 w-4 text-gold" />
                  </div>
                  {cat.group}
                </h2>
                <div className="panel divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
                  {cat.items.map((ep, idx) => (
                    <div key={idx} className="p-5 hover:bg-white/[0.02] transition space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={'text-xs font-mono font-bold px-2 py-0.5 rounded border ' + METHOD_COLOR[ep.method]}>
                            {ep.method}
                          </span>
                          <code className="text-sm font-mono text-ink font-semibold">{ep.path}</code>
                          <Badge tone={ep.auth === 'Owner' ? 'crimson' : ep.auth === 'User' ? 'purple' : 'neutral'}>
                            {ep.auth}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-mute leading-relaxed">{ep.desc}</p>
                      
                      {(ep.body || ep.response) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {ep.body && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-mono text-mute uppercase tracking-wider font-semibold">Request Body:</span>
                              <pre className="text-xs font-mono bg-night/90 text-gold-soft border border-white/5 p-3 rounded-lg overflow-x-auto whitespace-pre">
                                {ep.body}
                              </pre>
                            </div>
                          )}
                          {ep.response && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-mono text-mute uppercase tracking-wider font-semibold">Response JSON (200 OK):</span>
                              <pre className="text-xs font-mono bg-night/90 text-emerald-300 border border-white/5 p-3 rounded-lg overflow-x-auto whitespace-pre">
                                {ep.response}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
