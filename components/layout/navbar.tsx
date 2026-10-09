'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Moon, Trophy, User, Menu, X } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { LogoutButton } from './logout-button';

export function Navbar({ username }: { username: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-night/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-base sm:text-lg tracking-wide text-gold-soft shrink-0">
          <Moon className="h-5 w-5" aria-hidden /> Werewolf
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gold/30 bg-gold/10 text-xs font-semibold text-gold-soft hover:bg-gold/20 transition-colors"
          >
            <Trophy className="h-3.5 w-3.5 text-gold" /> Leaderboard
          </Link>
          {username ? (
            <>
              <LinkButton href="/lobby" variant="secondary" size="sm">
                Lobby
              </LinkButton>
              <Link
                href={`/profile/${username}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-ink hover:border-gold/40 hover:text-gold-soft transition-colors"
              >
                <User className="h-3.5 w-3.5 text-purple-soft" />
                <span className="font-semibold">@{username}</span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Masuk
              </LinkButton>
              <LinkButton href="/register" size="sm">
                Daftar
              </LinkButton>
            </>
          )}
        </nav>

        {/* Mobile Quick Action & Hamburger Button */}
        <div className="flex md:hidden items-center gap-1.5">
          {username && (
            <Link
              href="/lobby"
              className="px-2.5 py-1 rounded-lg border border-gold/30 bg-gold/10 text-xs font-semibold text-gold-soft"
            >
              Lobby
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg border border-white/10 bg-surface/80 text-ink hover:text-gold-soft focus:outline-none"
            aria-label="Buka Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {menuOpen && (
        <div className="md:hidden border-b border-white/10 bg-surface/95 backdrop-blur-2xl px-4 py-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/leaderboard"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-gold/10 border border-gold/30 text-sm font-semibold text-gold-soft"
          >
            <Trophy className="h-4 w-4 text-gold" /> Leaderboard Peringkat
          </Link>

          {username ? (
            <div className="space-y-2 pt-1 border-t border-white/10">
              <Link
                href={`/profile/${username}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-ink hover:border-gold/40"
              >
                <User className="h-4 w-4 text-purple-soft" /> Profil Saya (@{username})
              </Link>
              <div className="pt-1">
                <LogoutButton />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
              <LinkButton href="/login" variant="ghost" size="sm" onClick={() => setMenuOpen(false)}>
                Masuk
              </LinkButton>
              <LinkButton href="/register" size="sm" onClick={() => setMenuOpen(false)}>
                Daftar
              </LinkButton>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
