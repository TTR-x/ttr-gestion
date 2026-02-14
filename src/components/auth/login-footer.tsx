"use client";

import { useLoading } from "@/providers/loading-provider";
import { useRouter } from 'next/navigation';

export function LoginFooter() {
    const { showLoader } = useLoading();
    const router = useRouter();

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        showLoader();
        router.push('/register');
    };

    return (
        <p className="text-muted-foreground">
            Pas encore de compte ?&nbsp;
            <a href="/register" onClick={handleNavigate} className="text-primary hover:underline font-medium">
                Créez un compte
            </a>
        </p>
    );
}
