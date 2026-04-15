import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  height?: number;
};

export function BrandLogo({ className, height = 36 }: BrandLogoProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2 font-bold text-white", className)}
      style={{ height }}
    >
      <GraduationCap className="h-full w-auto shrink-0 text-blue-400" aria-hidden />
      <span className="text-lg tracking-tight">CCI</span>
    </div>
  );
}
