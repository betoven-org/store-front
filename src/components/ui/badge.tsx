import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap leading-none tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background",
        secondary:
          "bg-secondary text-secondary-foreground border-border",
        success:
          "bg-success-bg text-success",
        warning:
          "bg-warning-bg text-warning",
        destructive:
          "bg-danger-bg text-destructive",
        brand:
          "bg-brand-light text-brand-ink",
        outline:
          "border-border text-muted-foreground bg-card",
        ghost:
          "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
