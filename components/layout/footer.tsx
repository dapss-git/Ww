export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-mute sm:flex-row sm:items-center sm:justify-between">
        <p>Werewolf Online. Malam ini, siapa yang kamu percaya?</p>
        <div className="flex items-center gap-4 text-xs">
          <a href="/api/docs" className="text-gold-soft hover:underline">Dokumentasi API</a>
          <span>•</span>
          <a href="/owner/login" className="hover:text-ink">Owner</a>
          <span>•</span>
          <span>Next.js & PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
}
