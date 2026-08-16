import type { ReactNode } from "react";

import { SiteHeader } from "@/components/SiteHeader";

/**
 * Shared chrome for landing, login, and /train. Crisis /help is a sibling
 * route group and does not nest under this layout.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
