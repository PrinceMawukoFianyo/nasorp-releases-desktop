import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-500 text-white shadow hover:bg-blue-600",
        draft:
          "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        approved:
          "border-transparent bg-green-100 text-green-800 hover:bg-green-200",
        completed:
          "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200",
        cancelled:
          "border-transparent bg-red-100 text-red-800 hover:bg-red-200",
        pending:
          "border-transparent bg-orange-100 text-orange-800 hover:bg-orange-200",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * If true, shows a remove button (X icon) on the badge
   */
  removable?: boolean
  /**
   * Callback function when remove button is clicked
   */
  onRemove?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /**
   * Optional icon to display before the badge text
   */
  icon?: React.ReactNode
  /**
   * Optional dot indicator to show before the badge text
   */
  dot?: boolean
  /**
   * Makes the badge pill-shaped with fully rounded corners
   */
  pill?: boolean
}

function Badge({ 
  className, 
  variant, 
  size,
  removable = false,
  onRemove,
  icon,
  dot = false,
  pill = false,
  children,
  ...props 
}: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size }), 
        pill && "rounded-full",
        removable && "pr-1",
        className
      )} 
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span 
          className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" 
          aria-hidden="true"
        />
      )}
      
      {/* Icon */}
      {icon && (
        <span className="mr-1.5 -ml-0.5" aria-hidden="true">
          {icon}
        </span>
      )}
      
      {/* Content */}
      <span>{children}</span>
      
      {/* Remove button */}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1.5 inline-flex items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-0"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export { Badge, badgeVariants }