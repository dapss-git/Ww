import Link from 'next/link';
import { Eye, Moon, Shield, Skull, Swords, Users, Vote, Sun, Radio } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { Sky } from '@/components/layout/sky';
import { LinkButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser } from '@/lib/auth/session';
import { landingStats, recentMatches } from '@/lib/profile/service';
import { listRoles } from '@/lib/roles/registry';
import { WIN_LABEL, TEAM_LABEL } from '@/lib/game/labels';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

const STEPS = [
  { icon: Users, title: 'Kumpulkan pemain', text: 'Buat room, bagikan Room ID, dan tunggu semua pemain siap.' },
  { icon: Moon, title: 'Malam tiba', text: 'Serigala memilih mangsa. Peran lain diam-diam memakai kemampuannya.' },
  { icon: Sun, title: 'Pagi dan diskusi', text: 'Korban diumumkan. Desa berdebat siapa yang mencurigakan.' },
  { icon: Vote, title: 'Voting', text: 'Satu pemain digantung. Ulangi sampai satu pihak menang.' },
];

export default async function LandingPage() {
  const user = await safe(() => getCurrentUser(), null);
  const stats = await safe(landingStats, { users: 0, matches: 0, rooms: 0, online: 0 });
  const matches = await safe(() => recentMatches(5), []);
  const roles = listRoles();

  return (
    <>
      <Sky />
      <Navbar username={user?.username ?? null} />
      <main>
        <section className="mx-auto flex min-h-[78dvh] max-w-6xl flex-col justify-center px-4 pb-32 pt-16">
          <Badge tone="purple" className="mb-5 w-fit">Multiplayer realtime, 4 sampai 20 pemain</Badge>
          <h1 className="max-w-3xl font-display text-4xl leading-tight text-ink sm:text-6xl">
            Desa terlelap, serigala terjaga. Siapa yang kamu percaya malam ini?
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-mute sm:text-lg">
            Game deduksi sosial berlatar desa terpencil di bawah bulan purnama. Bangun aliansi, bongkar kebohongan, dan bertahan sampai fajar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={user ? '/lobby' : '/register'} size="lg">{user ? 'Masuk lobby' : 'Mulai bermain'}</LinkButton>
            {!user && <LinkButton href="/login" variant="secondary" size="lg">Aku sudah punya akun</LinkButton>}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl text-gold-soft sm:text-3xl">Cara bermain</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="panel p-5">
                <s.icon className="h-6 w-6 text-gold" aria-hidden />
                <h3 className="mt-3 font-display text-lg text-ink">{i + 1}. {s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl text-gold-soft sm:text-3xl">Peran di desa</h2>
          <p className="mt-2 max-w-xl text-sm text-mute">Peran inti selalu tersedia. Host bisa mengaktifkan peran tambahan untuk game yang lebih liar.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <article key={r.id} className="panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg text-ink">{r.name}</h3>
                  <div className="flex gap-1.5">
                    <Badge tone={r.team === 'WEREWOLF' ? 'crimson' : r.team === 'SOLO' ? 'purple' : 'gold'}>{TEAM_LABEL[r.team]}</Badge>
                    {!r.core && <Badge>Opsional</Badge>}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mute">{r.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-3">
          <div className="panel p-5">
            <Radio className="h-6 w-6 text-gold" aria-hidden />
            <h3 className="mt-3 font-display text-lg">Realtime dan adil</h3>
            <p className="mt-1.5 text-sm text-mute">Timer, voting, dan aksi malam dihitung di server. Tidak ada yang bisa curang lewat browser.</p>
          </div>
          <div className="panel p-5">
            <Eye className="h-6 w-6 text-gold" aria-hidden />
            <h3 className="mt-3 font-display text-lg">Mode penonton</h3>
            <p className="mt-1.5 text-sm text-mute">Room penuh atau game sudah jalan? Tonton tanpa melihat rahasia pemain.</p>
          </div>
          <div className="panel p-5">
            <Shield className="h-6 w-6 text-gold" aria-hidden />
            <h3 className="mt-3 font-display text-lg">Komposisi sesuka host</h3>
            <p className="mt-1.5 text-sm text-mute">Atur jumlah pemain, peran, dan mode kemenangan untuk setiap room.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl text-gold-soft sm:text-3xl">Desa saat ini</h2>
          <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Pemain terdaftar', stats.users],
              ['Online sekarang', stats.online],
              ['Room terbuka', stats.rooms],
              ['Match selesai', stats.matches],
            ].map(([label, value]) => (
              <div key={label as string} className="panel p-4">
                <dt className="text-sm text-mute">{label}</dt>
                <dd className="mt-1 font-display text-3xl text-ink">{(value as number).toLocaleString('id-ID')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-48 pt-6">
          <h2 className="font-display text-2xl text-gold-soft sm:text-3xl">Pertandingan terakhir</h2>
          {matches.length === 0 ? (
            <p className="panel mt-6 p-5 text-sm text-mute">Belum ada pertandingan yang selesai. Jadilah yang pertama menulis sejarah desa ini.</p>
          ) : (
            <ul className="mt-6 space-y-2">
              {matches.map((m) => (
                <li key={m.id}>
                  <Link href={`/match/${m.id}`} className="panel flex flex-wrap items-center justify-between gap-2 p-4 hover:border-gold/40">
                    <span className="flex items-center gap-2 text-sm">
                      {m.winnerTeam === 'WEREWOLF' ? <Skull className="h-4 w-4 text-crimson-soft" aria-hidden /> : <Swords className="h-4 w-4 text-gold" aria-hidden />}
                      {WIN_LABEL[m.winnerLabel] ?? m.winnerLabel}
                    </span>
                    <span className="text-xs text-mute">{m.roomCode} | {m.playerCount} pemain | {m.rounds} ronde | {formatDateTime(m.endedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
