"use client";

import { LoadingIndicator } from "./loading-indicator";

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingIndicator />
    </div>
  );
}
