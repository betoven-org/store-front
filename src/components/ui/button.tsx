import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[14px]",
  {
    variants: {
      variant: {
        default: "border border-border bg-card text-foreground hover:bg-accent hover:brightness-[0.97]",
        primary: "bg-foreground text-background border border-foreground hover:brightness-[0.97]",
        brand: "bg-brand text-white border border-brand-dark hover:brightness-[0.97]",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-foreground",
        destructive:
          "bg-danger-bg text-destructive border border-destructive/20 hover:bg-destructive/10 focus-visible:ring-destructive/20",
        link: "text-foreground underline-offset-4 hover:underline hover:text-brand",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-[26px] px-2 py-1 text-[12.5px] [&_svg:not([class*='size-'])]:size-[13px]",
        lg: "h-[38px] px-4 py-2",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
