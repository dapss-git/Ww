import Link from 'next/link';
import { Moon } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { LogoutButton } from './logout-button';

export function Navbar({ username }: { username: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide text-gold-soft">
          <Moon className="h-5 w-5" aria-hidden /> Werewolf
        </Link>
        <nav className="flex items-center gap-1.5">
          {username ? (
            <>
              <LinkButton href="/lobby" variant="secondary" size="sm">Lobby</LinkButton>
              <Link href={`/@${username}`} className="hidden px-2 text-sm text-mute hover:text-ink sm:inline">@{username}</Link>
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
