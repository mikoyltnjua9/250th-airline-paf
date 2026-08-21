/**
 * Official 250th Presidential Airlift Wing crest, supplied by the client
 * 2026-08-22 (public/crest.png, downscaled from the original 1080x1080 to
 * 256x256 -- plenty for the largest on-screen use at 64px). Replaced the
 * earlier navy/gold placeholder roundel. This component is still the only
 * place that needs to change if the art is ever updated again.
 */
export function Crest({ className }: { className?: string }) {
  return (
    // Fixed small branding mark rendered at many different Tailwind-driven
    // sizes across the app -- a plain <img> keeps that as simple as the
    // SVG it replaced, so next/image's LCP optimization isn't worth it here.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/crest.png" alt="250th Presidential Airlift Wing crest" className={className} />
  );
}
