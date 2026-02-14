// src/components/layout/app-logo.tsx
import { cn } from "@/lib/utils";
import Image from 'next/image';

interface AppLogoProps {
  className?: string;
  title?: string;
}

export function AppLogo({
  className,
  title = "Logo TTR Gestion",
}: AppLogoProps) {
  return (
    <div
      className={cn("relative", className)}
      title={title}
    >
      <Image 
        src="/ttr gestion.png" 
        alt="TTR Gestion Logo"
        width={72}
        height={72}
        priority
        className="rounded-md"
      />
    </div>
  );
}
