import { LinkButton } from '@/components/ui/button';
import { Sky } from '@/components/layout/sky';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <Sky />
      <div className="panel max-w-md space-y-3 p-6 text-center">
        <h1 className="font-display text-3xl text-gold-soft">404</h1>
        <p className="text-sm text-mute">Jalan setapak ini berujung di hutan gelap. Halaman yang kamu cari tidak ada.</p>
        <LinkButton href="/">Kembali ke desa</LinkButton>
      </div>
    </div>
  );
}
