import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

/**
 * White-label branding for the current tenant.
 *
 * There is no auth/tenant context yet (that lands in P1), so we inject a
 * sensible default brand. Once tenant resolution exists this becomes an async
 * fetch and the returned colour/title drive the whole shell.
 */
interface Branding {
  brandColor: string;
  title: string;
}

function getBranding(): Branding {
  // TODO(P1): fetch GET /api/tenant/branding once auth/tenant context exists.
  return {
    brandColor: "#1F4E79",
    // Default app name shown before the per-tenant branding loads client-side
    // (the /ess pages re-fetch GET /api/tenant/branding and apply primaryColor).
    title: "HR 差勤系統",
  };
}

const branding = getBranding();

export const metadata: Metadata = {
  title: branding.title,
  description: "多租戶白標 HR 差勤系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inject the tenant brand colour as a CSS custom property on <html> so any
  // component can colour itself with var(--brand) — the proof that white-label
  // theming flows from a single source.
  const brandStyle = { ["--brand" as string]: branding.brandColor } as CSSProperties;

  return (
    <html lang="zh-Hant" style={brandStyle}>
      <body>{children}</body>
    </html>
  );
}
