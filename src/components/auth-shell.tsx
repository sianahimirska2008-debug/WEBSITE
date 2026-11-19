export function AuthShell({ eyebrow, title, accent, children }: { eyebrow: string; title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-band">
      <div className="container-page flex justify-center py-12 sm:py-20">
        <div className="w-full max-w-md">
          <p className="eyebrow text-on-band-muted">{eyebrow}</p>
          <h1 className="mt-2 text-4xl text-on-band sm:text-5xl">
            {title} <em className="italic text-adam">{accent}</em>
          </h1>
          <div className="card mt-8 p-6 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[var(--radius-field)] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}
