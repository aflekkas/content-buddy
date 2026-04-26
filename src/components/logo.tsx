import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_NAME, MASCOT_SRC } from "@/lib/brand";

type LogoProps = {
  className?: string;
  size?: number;
};

export function LogoMark({ className, size = 32 }: LogoProps) {
  return (
    <Image
      src={MASCOT_SRC}
      alt={BRAND_NAME}
      width={size}
      height={size}
      priority
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function Logo({
  className,
  size = 32,
  showWordmark = true,
}: LogoProps & { showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight">
          {BRAND_NAME}
        </span>
      )}
    </div>
  );
}
