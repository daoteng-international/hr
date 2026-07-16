"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getBranding } from "@/lib/ess-api";

const EMPLOYEE_TITLE = "HRLink 員工入口";
const ADMIN_TITLE = "HRLink 管理後台";

export function TenantBranding() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    getBranding()
      .then((res) => {
        if (!active) return;
        const primaryColor = res.branding?.primaryColor;
        const appName = res.branding?.appName;
        if (primaryColor) {
          document.documentElement.style.setProperty("--brand", primaryColor);
        }
        if (pathname.startsWith("/admin")) {
          document.title = ADMIN_TITLE;
        } else if (pathname === "/login" || pathname.startsWith("/ess")) {
          document.title = EMPLOYEE_TITLE;
        } else if (appName) {
          document.title = appName;
        }
      })
      .catch(() => {
        /* Unauthenticated pages keep the default brand. */
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return null;
}
