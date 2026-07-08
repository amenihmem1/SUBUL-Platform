import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CV Booster",
  description: "Boost your CV with ATS optimization",
};

export default function CVLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
