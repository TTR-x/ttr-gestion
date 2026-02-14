

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Settings, CreditCard, LifeBuoy, Check, Briefcase, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function UserNav() {
  const { currentUser, logout, businessProfile, switchWorkspace, activeWorkspaceId, showLoader, isAdmin } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  if (!currentUser) {
    return null;
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const roleTranslations: { [key: string]: string } = {
    admin: "Administrateur",
    employee: "Employé",
  };
  const userRole = currentUser.role ? roleTranslations[currentUser.role] || currentUser.role : 'N/A';

  const workspaces = businessProfile?.workspaces ? Object.values(businessProfile.workspaces) : [];
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(currentUser.displayName)}`} alt={currentUser.displayName || ""} data-ai-hint="avatar person" />
            <AvatarFallback>{getInitials(currentUser.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize pt-1">
              {activeWorkspace?.name || 'Chargement...'} - {userRole}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isAdmin && workspaces.length > 1 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Briefcase className="mr-2 h-4 w-4" />
                <span>Changer d'espace</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {workspaces.map(ws => (
                    <DropdownMenuItem key={ws.id} onClick={() => switchWorkspace(ws.id)}>
                      {activeWorkspaceId === ws.id && <Check className="mr-2 h-4 w-4" />}
                      <span>{ws.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Mon Profil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Paramètres</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              <span>Thème</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={8}>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Clair</span>
                  {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Sombre</span>
                  {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>Système</span>
                  {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
