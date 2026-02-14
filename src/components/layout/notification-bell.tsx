
"use client";

import { Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useLoading } from "@/providers/loading-provider";

export function NotificationBell() {
  const { notifications } = useAuth();
  const { showLoader } = useLoading();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Ouvrir les notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 animate-pulse"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 whitespace-normal" asChild>
                    <Link href={notification.href || "#"}>
                      <p className="font-semibold">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.description}</p>
                    </Link>
                  </DropdownMenuItem>
              ))
          ) : (
              <p className="p-4 text-sm text-center text-muted-foreground">Aucune nouvelle notification.</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-1">
            <Button variant="ghost" className="w-full justify-center" asChild>
                <Link href="/notifications" onClick={showLoader}>
                    Voir toutes les notifications <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
