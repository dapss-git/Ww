import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Sky } from '@/components/layout/sky';
import { FollowButton } from '@/components/profile/follow-button';
import { ProfileEditor } from '@/components/profile/profile-editor';
import { Badge } from '@/components/ui/badge';
import { AppError } from '@/lib/api/response';
import { getCurrentUser } from '@/lib/auth/session';
import { WIN_LABEL } from '@/lib/game/labels';
import { Award, Coins, Flame, Sparkles } from 'lucide-react';
import type { RoleId } from '@/lib/game/constants';
import { getProfile } from '@/lib/profile/service';
import { ROLES, isRoleId } from '@/lib/roles/registry';
import { formatDate, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const roleName = (r: string | null) => (r && isRoleId(r) ? ROLES[r as RoleId].name : '-');

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username).replace(/^@/, '')}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  let profile;
  try {
    profile = await getProfile(decodeURIComponent(username).replace(/^@/, ''), viewer?.id ?? null);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }
  const s = profile.stats;

  return (
    <>
      <Sky />
      <Navbar username={viewer?.username ?? null} />
      <main className="mx-auto max-w-4xl px-4 py-8 pb-32">
        <div className="panel overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-purple/60 via-night to-crimson/40 sm:h-44" style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
          <div className="relative px-5 pb-5">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-surface bg-purple font-display text-3xl text-gold-soft">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.username[0].toUpperCase()}
              </div>
              {viewer && !profile.isSelf && <FollowButton username={profile.username} initialFollowing={profile.isFollowing} />}
            </div>
            <h1 className="mt-3 font-display text-3xl text-ink">@{profile.username}</h1>
            <p className="mt-1 text-sm text-mute">Bergabung {formatDate(profile.createdAt)}</p>
            {profile.bio && <p className="mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed">{profile.bio}</p>}
            <p className="mt-3 flex gap-4 text-sm"><span><b>{profile.followers}</b> <span className="text-mute">pengikut</span></span><span><b>{profile.following}</b> <span className="text-mute">mengikuti</span></span></p>
          </div>
        </div>

        {profile.isSelf && <ProfileEditor bio={profile.bio} avatarUrl={profile.avatarUrl ?? ''} bannerUrl={profile.bannerUrl ?? ''} />}

        {/* Gelar / Title & Koin */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="panel p-4 flex items-center gap-3 border-gold/30 bg-gold/5">
            <div className="p-3 rounded-xl bg-gold/20 text-gold-soft">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-mute">Gelar Kehormatan</p>
              <p className="font-display text-lg text-gold-soft font-bold">
                {s.wins >= 10 ? 'Pemenang Sejati' : s.wins >= 5 ? 'Penyintas Tangguh' : s.wins >= 1 ? 'Pemburu Ulung' : 'Warga Pemula'}
              </p>
            </div>
          </div>

          <div className="panel p-4 flex items-center gap-3 border-amber-500/30 bg-amber-500/5">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-mute">Pundi Koin Desa</p>
              <p className="font-display text-lg text-amber-300 font-bold">
                {100 + s.wins * 50 + s.totalGames * 10} Koin
              </p>
            </div>
          </div>

          <div className="panel p-4 flex items-center gap-3 border-purple/30 bg-purple/5">
            <div className="p-3 rounded-xl bg-purple/20 text-purple-soft">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-mute">Status Keberanian</p>
              <p className="font-display text-lg text-purple-soft font-bold">
                Level {Math.floor(s.totalGames / 3) + 1}
              </p>
            </div>
          </div>
        </div>

        {/* Misi & Pencapaian */}
        <section className="mt-6 panel p-5 border-white/10">
          <h2 className="font-display text-lg text-ink mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" /> Misi & Pencapaian
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border ${s.wins >= 1 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/5 bg-night/40 opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-ink">Kemenangan Perdana</span>
                <span className="text-[10px] font-bold text-emerald-400">{s.wins >= 1 ? 'SELESAI (+50 Koin)' : `${s.wins}/1`}</span>
              </div>
              <p className="text-[11px] text-mute mt-1">Menangkan minimal 1 pertandingan dalam mode apa pun.</p>
            </div>

            <div className={`p-3 rounded-xl border ${s.wins >= 5 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/5 bg-night/40 opacity-70'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-ink">Gelar: Pemenang Sejati</span>
                <span className="text-[10px] font-bold text-gold-soft">{s.wins >= 10 ? 'SELESAI (+500 Koin)' : `${s.wins}/10 Win`}</span>
              </div>
              <p className="text-[11px] text-mute mt-1">Raih 10 kemenangan untuk mengklaim gelar &apos;Pemenang Sejati&apos;.</p>
            </div>
          </div>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Total game', s.totalGames],
            ['Menang', s.wins],
            ['Kalah', s.losses],
            ['Win rate', `${s.winRate}%`],
            ['Role terbanyak', roleName(s.mostPlayedRole)],
            ['Role paling menang', roleName(s.mostWonRole)],
          ].map(([label, value]) => (
            <div key={label as string} className="panel p-3">
              <dt className="text-xs text-mute">{label}</dt>
              <dd className="mt-1 font-display text-xl">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl text-gold-soft">Riwayat pertandingan</h2>
          {profile.history.length === 0 ? (
            <p className="panel p-4 text-sm text-mute">Belum ada pertandingan.</p>
          ) : (
            <ul className="space-y-2">
              {profile.history.map((h) => (
                <li key={h.matchId}>
                  <Link href={`/match/${h.matchId}`} className="panel flex flex-wrap items-center justify-between gap-2 p-3 hover:border-gold/40">
                    <span className="flex items-center gap-2 text-sm">
                      <Badge tone={h.won ? 'green' : 'neutral'}>{h.won ? 'Menang' : 'Kalah'}</Badge>
                      {roleName(h.role)}
                    </span>
                    <span className="text-xs text-mute">{WIN_LABEL[h.winnerLabel] ?? h.winnerLabel} | {h.playerCount} pemain | {formatDateTime(h.endedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
