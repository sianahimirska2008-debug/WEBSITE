/** Pale green band that continues from the header at the top of inner pages. */
export function PageBand({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-band text-on-band ${className}`}>
      <div className="container-page pb-10 pt-8 sm:pb-14 sm:pt-12">{children}</div>
    </div>
  );
}
