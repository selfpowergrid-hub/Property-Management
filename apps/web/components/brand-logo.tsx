"use client";

import { useState } from "react";

/**
 * Product logo for the auth screens. Renders /logo.png when present and
 * gracefully falls back to the wordmark until the image is added, so the login
 * screen never shows a broken image.
 */
export function BrandLogo({ className = "h-14 w-auto" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="font-serif text-2xl font-semibold">LogiQ Estates Pro</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="LogiQ Estates Pro" className={className} onError={() => setFailed(true)} />
  );
}
