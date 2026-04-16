export const SectionCard = ({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-glow backdrop-blur">
    {eyebrow ? <p className="text-[11px] uppercase tracking-[0.28em] text-lagoon/70">{eyebrow}</p> : null}
    <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
    <div className="mt-4 space-y-4 text-sm text-slate-600">{children}</div>
  </section>
);

