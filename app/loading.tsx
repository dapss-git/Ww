import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex items-center gap-3 text-mute">
        <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden />
        <span>Memuat...</span>
      </div>
    </div>
  );
}
