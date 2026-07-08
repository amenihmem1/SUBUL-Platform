import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        blue: "border-transparent bg-brand-light text-primary",
        green: "border-transparent bg-success-muted text-success-text",
        orange: "border-transparent bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
        purple: "border-transparent bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
        gray: "border-transparent bg-muted text-muted-foreground",
        teal: "border-transparent bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
      },
    },
    defaultVariants: {
      variant: "blue",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
