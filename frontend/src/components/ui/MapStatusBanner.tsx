export function MapStatusBanner({ tileError }: { tileError: boolean }) {
  if (!tileError) return null;

  return (
    <div className="absolute left-3 right-3 top-3 z-[500] rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm backdrop-blur">
      Tile blocked / tile failed to load. The map provider may be blocked by the network or browser policy, but operational markers remain available.
    </div>
  );
}
