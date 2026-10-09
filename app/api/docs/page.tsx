import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Sky } from '@/components/layout/sky';
import { getCurrentUser } from '@/lib/auth/session';
import { Badge } from '@/components/ui/badge';
import { Code, Terminal, Key, Database, Users, Shield, Radio, CheckCircle } from 'lucide-react';

export const metadata = { title: 'Dokumentasi API' };

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  desc: string;
  auth: 'Public' | 'User' | 'Owner';
  body?: string;
}

const ENDPOINTS: { group: string; items: ApiEndpoint[] }[] = [
  {
    group: 'Autentikasi & Akun',
    items: [
      { method: 'POST', path: '/api/auth/guest', desc: 'Masuk cepat sebagai tamu (nickname)', auth: 'Public', body: '{"nickname": "string"}' },
      { method: 'POST', path: '/api/auth/register', desc: 'Daftar akun permanen', auth: 'Public', body: '{"username", "password", "confirmPassword"}' },
      { method: 'POST', path: '/api/auth/login', desc: 'Masuk akun terdaftar', auth: 'Public', body: '{"username", "password", "remember?"}' },
      { method: 'GET', path: '/api/auth/me', desc: 'Dapatkan identitas sesi pengguna', auth: 'User' },
      { method: 'POST', path: '/api/auth/logout', desc: 'Keluar dan hapus cookie sesi', auth: 'User' },
    ],
  },
  {
    group: 'Room & Permainan',
    items: [
      { method: 'GET', path: '/api/rooms', desc: 'Daftar room publik yang sedang dibuka', auth: 'User' },
      { method: 'POST', path: '/api/rooms', desc: 'Buat room baru dengan mode & visibilitas', auth: 'User', body: '{"minPlayers", "maxPlayers", "gameMode", "visibility"}' },
      { method: 'GET', path: '/api/rooms/:code', desc: 'Detail status pemain dan konfigurasi room', auth: 'User' },
      { method: 'POST', path: '/api/rooms/:code/join', desc: 'Bergabung ke dalam room', auth: 'User' },
      { method: 'POST', path: '/api/rooms/:code/leave', desc: 'Keluar dari room saat ini', auth: 'User' },
      { method: 'POST', path: '/api/rooms/:code/ready', desc: 'Ubah status siap / not ready', auth: 'User', body: '{"ready": boolean}' },
      { method: 'POST', path: '/api/rooms/:code/start', desc: 'Mulai permainan (hanya host)', auth: 'User' },
      { method: 'POST', path: '/api/rooms/:code/spectate', desc: 'Masuk sebagai penonton', auth: 'User' },
    ],
  },
  {
    group: 'Siklus Game (Fase Malam & Siang)',
    items: [
      { method: 'GET', path: '/api/games/:id', desc: 'Ambil state game (role tersaring sesuai viewer)', auth: 'User' },
      { method: 'POST', path: '/api/games/:id/action', desc: 'Kirim aksi peran (bunuh, lindungi, intip)', auth: 'User', body: '{"type", "targetId"}' },
      { method: 'POST', path: '/api/games/:id/vote', desc: 'Kirim voting gantung di siang hari', auth: 'User', body: '{"targetId"}' },
      { method: 'POST', path: '/api/chat', desc: 'Kirim pesan chat publik atau obrolan serigala', auth: 'User', body: '{"gameId", "channel", "content"}' },
    ],
  },
  {
    group: 'Owner & Diagnostik Sistem',
    items: [
      { method: 'POST', path: '/api/owner/auth/login', desc: 'Login dashboard owner', auth: 'Public' },
      { method: 'GET', path: '/api/owner/stats', desc: 'Statistik latency DB, koneksi, & server', auth: 'Owner' },
      { method: 'POST', path: '/api/owner/test-room', desc: 'Simulasi bot otomatis untuk testing bug', auth: 'Owner' },
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
      <main className="mx-auto max-w-5xl px-4 py-10 pb-32">
        <div className="mb-8 space-y-3">
          <Badge tone="gold" className="w-fit"><Terminal className="h-3.5 w-3.5 mr-1" /> Werewolf REST API Reference</Badge>
          <h1 className="font-display text-4xl text-ink">Dokumentasi API & Integrasi</h1>
          <p className="max-w-2xl text-mute text-base leading-relaxed">
            Spesifikasi endpoint resmi Werewolf Online. Semua endpoint mengembalikan format JSON standar <code className="text-gold-soft bg-white/5 px-1.5 py-0.5 rounded">{'{"success": true, "data": {...}}'}</code>.
          </p>
        </div>

        <div className="grid gap-8">
          {ENDPOINTS.map((cat) => (
            <section key={cat.group} className="space-y-3">
              <h2 className="font-display text-xl text-gold-soft flex items-center gap-2">
                <Code className="h-5 w-5 text-gold" /> {cat.group}
              </h2>
              <div className="panel divide-y divide-white/5 overflow-hidden">
                {cat.items.map((ep, idx) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${METHOD_COLOR[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="text-sm font-mono text-ink font-semibold">{ep.path}</code>
                        <Badge tone={ep.auth === 'Owner' ? 'crimson' : ep.auth === 'User' ? 'purple' : 'neutral'}>
                          {ep.auth}
                        </Badge>
                      </div>
                      <p className="text-xs text-mute">{ep.desc}</p>
                    </div>
                    {ep.body && (
                      <div className="text-xs font-mono bg-night/80 text-mute border border-white/5 px-2.5 py-1.5 rounded-lg max-w-xs truncate">
                        Payload: {ep.body}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
