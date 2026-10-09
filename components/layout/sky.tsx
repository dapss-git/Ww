/** Latar malam: langit, bulan purnama, kabut, dan siluet hutan. Dekoratif saja. */
export function Sky({ moon = true }: { moon?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden night-sky">
      {moon && <div className="moon absolute right-[10%] top-[8%] h-20 w-20 rounded-full sm:h-28 sm:w-28" />}
      <div className="fog-layer absolute inset-0 animate-drift" />
      <div
        className="absolute inset-x-0 bottom-0 h-40 opacity-95 sm:h-56"
        style={{ backgroundImage: 'url(/forest.svg)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
      />
    </div>
  );
}
