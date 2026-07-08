"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getUserIdFromToken } from "@/lib/auth/token";

/**
 * Workflow URLs:
 * - /{locale}/search-job?user_id=…&scan=1 → dashboard emploi + lancer le scraping (après upload CV)
 * - /{locale}/search-job?user_id=…       → afficher les jobs déjà en base pour cet utilisateur
 */
function SearchJobRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "en";
  const qUserId = searchParams.get("user_id") || "";
  const scan = searchParams.get("scan") === "1";

  useEffect(() => {
    const tokenUid = getUserIdFromToken();
    if (!tokenUid) {
      router.replace(`/${locale}/auth/login?returnUrl=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`);
      return;
    }
    if (!qUserId) {
      router.replace(`/${locale}/search-job?user_id=${tokenUid}${scan ? "&scan=1" : ""}`);
      return;
    }
    if (qUserId !== tokenUid) {
      router.replace(`/${locale}/search-job?user_id=${tokenUid}${scan ? "&scan=1" : ""}`);
      return;
    }
    sessionStorage.setItem("jobscan_user_id", qUserId);
    const target = `/${locale}/dashboard/learner/emploi${scan ? "?scan=1" : ""}`;
    router.replace(target);
  }, [router, pathname, searchParams, locale, qUserId, scan]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}

export default function SearchJobPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center">Loading…</div>}>
      <SearchJobRedirect />
    </Suspense>
  );
}
