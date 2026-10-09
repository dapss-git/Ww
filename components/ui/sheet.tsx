'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'bottom';
  children: React.ReactNode;
}

/** Drawer (kiri) atau bottom sheet untuk tampilan mobile. */
export function Sheet({ open, onClose, title, side = 'bottom', children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div className={cn('absolute inset-0 bg-black/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute flex flex-col border-white/10 bg-surface shadow-2xl transition-transform duration-200',
          side === 'left'
            ? 'left-0 top-0 h-full w-[84%] max-w-xs border-r'
            : 'bottom-0 left-0 right-0 h-[78dvh] rounded-t-2xl border-t',
          side === 'left' ? (open ? 'translate-x-0' : '-translate-x-full') : open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-display text-base text-gold-soft">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-mute hover:bg-white/10 hover:text-ink" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-thin">{children}</div>
      </section>
    </div>
  );
}
