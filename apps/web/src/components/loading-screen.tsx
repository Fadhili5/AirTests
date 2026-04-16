export const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="rounded-[28px] border border-white/70 bg-white/90 px-8 py-10 text-center shadow-glow">
      <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-lagoon/20" />
      <p className="mt-4 text-sm text-slate-600">{message}</p>
    </div>
  </div>
);

