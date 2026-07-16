import type { Metadata } from "next";

import QuotePageClient from "./QuotePageClient";

export const metadata: Metadata = {
  title: "HRLink 方案估價器",
  description: "依照公司人數與功能需求，自由組合最適合的 HRLink 方案並立即產生報價。",
};

export default function QuotePage() {
  return <QuotePageClient />;
}
