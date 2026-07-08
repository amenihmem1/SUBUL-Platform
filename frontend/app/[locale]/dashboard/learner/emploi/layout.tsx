import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Assistant",
  description: "AI-powered career coach",
};

export default function EmploiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
