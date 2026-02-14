import { LoadingIndicator } from "@/components/layout/loading-indicator";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingIndicator />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}
