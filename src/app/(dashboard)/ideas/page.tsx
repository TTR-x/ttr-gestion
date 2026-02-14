"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

// This page is obsolete and its content has been removed.
// It can be deleted in the future.
export default function IdeasHubPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="text-center">
        <CardHeader>
           <Construction className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle>Fonctionnalité en cours de retrait</CardTitle>
          <CardDescription>Cette section est en cours de suppression.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
