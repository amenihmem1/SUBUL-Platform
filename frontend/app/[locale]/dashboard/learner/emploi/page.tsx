"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  RefreshCw,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getUserIdFromToken } from "@/lib/auth/token";
import { useCvStatus } from "@/hooks/api/useCvBooster";
import { useTranslation } from "@/contexts/LanguageContext";
import EmploiDashboard from "./dashboard";

export default function EmploiLandingPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";
  const { t } = useTranslation();
  const [uid, setUid] = useState<string | null>(null);
  const {
    data: cvStatus,
    isLoading: cvLoading,
    isError: cvError,
    refetch: refetchCv,
  } = useCvStatus();

  useEffect(() => {
    const id = getUserIdFromToken();
    setUid(id);
    if (id && id !== "user_default") {
      fetch(`/api/cv/store-user`, {
        method: "POST",
        body: new URLSearchParams({ user_id: id }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }).catch((err) => console.warn("Failed to store user:", err));
    }
  }, []);

  if (!uid) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">
            {String(t("emploiHub.loading"))}
          </p>
        </div>
      </div>
    );
  }

  const hasCv = Boolean(cvStatus?.hasCv);
  const status = cvStatus?.status ?? "missing";
  const canUseCv = hasCv && status === "ready";
  const isProcessing = status === "processing";
  const viewCvHref = `/${locale}/dashboard/learner/cv/view`;

  // If the profile is ready, render the full dashboard feature area.
  // Otherwise, render the empty state prompting an upload.
  if (!cvLoading && !cvError && status !== "error" && canUseCv) {
    return <EmploiDashboard />;
  }

  return (
    <div className="min-h-[80vh] flex items-start justify-center pt-10 pb-16 px-4">
      {/* Ambient background blobs — absolute on a relative wrapper to avoid layout shift */}
      <div className="relative w-full max-w-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-purple-400/8 blur-3xl -z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-40 w-[380px] h-[380px] rounded-full bg-pink-400/8 blur-3xl -z-10"
        />

        {/* Page header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-[11px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            {String(t("emploiHub.badge"))}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {String(t("emploiHub.pageTitle"))}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            {canUseCv
              ? String(t("emploiHub.cvReadyDesc"))
              : String(t("emploiHub.noCvDesc"))}
          </p>
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden"
        >
          {/* Gradient top bar */}
          <div className="h-1.5 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600" />

          <div className="p-6 md:p-8 space-y-5">

            {/* ── LOADING ─────────────────────────────────────── */}
            {cvLoading && (
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-100" />
                  <Loader2 className="absolute inset-0 m-auto w-7 h-7 animate-spin text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800">
                    {String(t("emploiHub.loadingTitle"))}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {String(t("emploiHub.loadingDesc"))}
                  </p>
                </div>
              </div>
            )}

            {/* ── ERROR ───────────────────────────────────────── */}
            {!cvLoading && (cvError || status === "error") && (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">
                      {String(t("emploiHub.errorTitle"))}
                    </p>
                    <p className="text-amber-700 mt-0.5 text-xs leading-relaxed">
                      {String(t("emploiHub.errorDesc"))}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-11 gap-2"
                    onClick={() => refetchCv()}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {String(t("emploiHub.retry"))}
                  </Button>
                  <Button
                    className="h-11 gap-2 text-white border-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700 shadow-md"
                    onClick={() =>
                      router.push(`/${locale}/upload-cv?user_id=${uid}`)
                    }
                  >
                    <Upload className="w-4 h-4" />
                    {String(t("emploiHub.uploadCv"))}
                  </Button>
                </div>
              </>
            )}

            {/* ── NO CV ───────────────────────────────────────── */}
            {!cvLoading && !cvError && status !== "error" && !canUseCv && (
              <>
                {/* Upload CTA */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/${locale}/upload-cv?user_id=${uid}`)
                  }
                  className="w-full rounded-xl border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/40 hover:bg-violet-50/80 transition-all duration-200 py-9 px-6 text-center group cursor-pointer"
                >
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-100 to-violet-100 border border-violet-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Upload className="w-5 h-5 text-violet-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    {String(t("emploiHub.uploadAction"))}
                  </p>
                  <p className="text-xs text-slate-500">
                    {String(t("emploiHub.uploadFormats"))}
                  </p>
                </button>

                {/* Processing notice */}
                {isProcessing && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    {String(t("emploiHub.processing"))}
                  </div>
                )}

                {/* Browse jobs */}
                <Button
                  variant="outline"
                  className="w-full h-11 gap-2 hover:border-violet-300 hover:text-violet-700"
                  onClick={() =>
                    router.push(`/${locale}/search-job?user_id=${uid}`)
                  }
                >
                  <Briefcase className="w-4 h-4 text-violet-500" />
                  {String(t("emploiHub.browseJobs"))}
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-400 mt-5">
          {String(t("emploiHub.privacyNote"))}
        </p>
      </div>
    </div>
  );
}
