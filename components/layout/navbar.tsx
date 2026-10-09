import Link from 'next/link';
import { Moon, Trophy, User } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { LogoutButton } from './logout-button';

export function Navbar({ username }: { username: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide text-gold-soft">
          <Moon className="h-5 w-5" aria-hidden /> Werewolf
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/leaderboard" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gold/30 bg-gold/10 text-xs font-semibold text-gold-soft hover:bg-gold/20 transition-colors">
            <Trophy className="h-3.5 w-3.5 text-gold" /> Leaderboard
          </Link>
          {username ? (
            <>
              <LinkButton href="/lobby" variant="secondary" size="sm">Lobby</LinkButton>
              <Link href={`/@${username}`} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-ink hover:border-gold/40 hover:text-gold-soft transition-colors">
                <User className="h-3.5 w-3.5 text-purple-soft" />
                <span className="font-semibold">@{username}</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">Masuk</LinkButton>
              <LinkButton href="/register" size="sm">Daftar</LinkButton>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
