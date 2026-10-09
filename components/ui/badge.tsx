import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'gold' | 'crimson' | 'purple' | 'green';

const TONE: Record<Tone, string> = {
  neutral: 'border-white/15 bg-white/5 text-mute',
  gold: 'border-gold/40 bg-gold/10 text-gold-soft',
  crimson: 'border-crimson/50 bg-crimson/15 text-crimson-soft',
  purple: 'border-purple/60 bg-purple/20 text-purple-soft',
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', TONE[tone], className)}>{children}</span>;
}
