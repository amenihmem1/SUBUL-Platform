import { cn } from "@/lib/utils";

type LearnerPageShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function LearnerPageShell({ children, className }: LearnerPageShellProps) {
  return <section className={cn("learner-page-shell", className)}>{children}</section>;
}

