"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useTranslation } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useParams, usePathname } from "next/navigation";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { UniversityProvider, useUniversity } from "@/contexts/UniversityContext";
import { UniversityBadge } from "@/components/university/UniversityBadge";
import { UniversityAccessGate } from "@/components/university/UniversityAccessGate";
import { getSubscriptionStatus } from "@/services/subscriptions";

function LearnerDashboardChrome({
  locale,
  sidebarOpen,
  setSidebarOpen,
  isRTL,
  t,
  session,
  children,
}: {
  locale: string;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  isRTL: boolean;
  t: (key: string) => string;
  session: ReturnType<typeof useAuth>["session"];
  children: ReactNode;
}) {
  const { hasInstitutionalAccess, isLoading: uniLoading } = useUniversity();
  const pathname = usePathname();
  const { data: subStatus, isLoading: subLoading } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: getSubscriptionStatus,
    staleTime: 30_000,
  });
  const isStudentRole = session?.user?.role === "student";
  const showUniBadge = isStudentRole || (!uniLoading && hasInstitutionalAccess);
  const hidePersonalSubscriptionUi =
    isStudentRole ||
    (!uniLoading && hasInstitutionalAccess) ||
    (!subLoading &&
      (subStatus?.accessSource === "institutional" || subStatus?.canUsePersonalSubscriptionFlow === false));

  return (
    <>
      <UniversityAccessGate />
      {!isStudentRole && <SubscriptionGate locale={locale} />}

      <Sidebar
        role="student"
        open={sidebarOpen}
        toggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ease-spring ${
        isRTL
          ? (sidebarOpen ? 'mr-[250px]' : 'mr-0 lg:mr-[78px]')
          : (sidebarOpen ? 'ml-[250px]' : 'ml-0 lg:ml-[78px]')
      }`}>
        <Header
          userName={String(session?.user?.fullName || session?.user?.email || t('roles.student'))}
          role="student"
        />
        <main className="flex-1 min-w-0 overflow-auto bg-[#f8f8fd] p-4 sm:p-5 lg:p-6">
          {showUniBadge && (
            <div className="mb-4">
              <UniversityBadge />
            </div>
          )}
          {children}
        </main>
      </div>
    </>
  );
}

export default function LearnerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { dir, t } = useTranslation();
  const { session } = useAuth();
  const params = useParams();
  const isRTL = dir === "rtl";
  const locale = String(params?.locale || "en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("learner-sidebar-open");
      const isMobile = window.innerWidth < 1024;
      
      let shouldBeOpen = false;
      if (saved !== null) {
        try {
          shouldBeOpen = JSON.parse(saved);
        } catch {
          shouldBeOpen = false;
        }
      } else {
        shouldBeOpen = !isMobile;
      }
      
      setSidebarOpen(shouldBeOpen);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem("learner-sidebar-open", JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, isInitialized]);

  return (
    <UniversityProvider>
      <div className="min-h-screen bg-background flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <LearnerDashboardChrome
          locale={locale}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isRTL={isRTL}
          t={t}
          session={session}
        >
          {children}
        </LearnerDashboardChrome>
      </div>
    </UniversityProvider>
  );
}
