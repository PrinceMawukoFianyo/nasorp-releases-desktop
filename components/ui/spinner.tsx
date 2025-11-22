import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.ComponentProps<"svg"> {
  size?: "sm" | "md" | "lg" | "xl";
}

function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "size-5",
    md: "size-8",
    lg: "size-12",
    xl: "size-16"
  };

  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin text-current",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export function SpinnerCustom({ 
  text = "Loading...",
  size = "md",
  className 
}: { 
  text?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      <Spinner size={size} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function SpinnerPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function SpinnerOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center overflow-hidden">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export { Spinner };