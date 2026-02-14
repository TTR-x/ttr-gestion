
"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function InstallButton() {
  const { canInstall, handleInstallClick } = usePwaInstall();

  if (!canInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        onClick={handleInstallClick}
        variant="secondary"
        className="rounded-full h-14 w-auto p-4 shadow-lg hover:scale-110 transition-transform duration-200 animate-in fade-in"
      >
        <Download className="h-6 w-6 mr-2" />
        <span className="text-sm font-semibold">Installer</span>
      </Button>
    </div>
  );
}
