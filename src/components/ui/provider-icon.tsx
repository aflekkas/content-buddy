import Image from "next/image";
import { cn } from "@/lib/utils";
import { PROVIDERS, type ProviderId } from "@/lib/providers";

type Props = {
  provider: ProviderId;
  size?: number;
  className?: string;
};

export function ProviderIcon({ provider, size = 20, className }: Props) {
  const meta = PROVIDERS[provider];
  return (
    <Image
      src={meta.logo}
      alt={meta.label}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}
