"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Gamepad2,
    Crown,
    Layers,
    Hash,
    Type,
    Grid2X2,
    Shapes,
    CircleDot,
    Bomb,
    Divide,
    LayoutGrid,
    Trophy,
    Sparkles,
    Play
} from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

const games = [
    { name: "Échecs", href: "/games/chess", description: "Stratégie & Maîtrise", available: true, icon: Crown, color: "from-amber-500 to-orange-700", category: "Stratégie" },
    { name: "2048", href: "/games/2048", description: "Puzzle Mathématique", available: true, icon: Divide, color: "from-blue-500 to-cyan-700", category: "Logique" },
    { name: "Solitaire", href: "/games/solitaire", description: "Classique Solo", available: false, icon: Layers, color: "from-red-500 to-rose-700", category: "Cartes" },
    { name: "Sudoku", href: "/games/sudoku", description: "Logique des Chiffres", available: false, icon: Hash, color: "from-emerald-500 to-teal-700", category: "Puzzle" },
    { name: "Mots Croisés", href: "/games/crossword", description: "Vocabulaire & Lettres", available: false, icon: Type, color: "from-purple-500 to-indigo-700", category: "Lettres" },
    { name: "Dames", href: "/games/checkers", description: "Tradition Tactique", available: false, icon: Grid2X2, color: "from-slate-500 to-zinc-700", category: "Stratégie" },
    { name: "Mahjong", href: "/games/mahjong", description: "Association de Tuiles", available: false, icon: Shapes, color: "from-pink-500 to-fuchsia-700", category: "Puzzle" },
    { name: "Puissance 4", href: "/games/connect-four", description: "Alignez la Victoire", available: false, icon: CircleDot, color: "from-yellow-500 to-amber-700", category: "Duel" },
    { name: "Démineur", href: "/games/minesweeper", description: "Attention aux Bombes", available: false, icon: Bomb, color: "from-gray-700 to-slate-900", category: "Logique" },
    { name: "Tetris", href: "/games/tetris", description: "Le Roi des Puzzles", available: false, icon: LayoutGrid, color: "from-blue-600 to-indigo-900", category: "Arcade" },
];

export default function GamesPage() {
    return (
        <div className="min-h-screen space-y-8 pb-12">
            <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20 ring-1 ring-primary/40">
                        <Gamepad2 className="h-6 w-6 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                    </div>
                    <h1 className="text-4xl font-headline font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Game Studio
                    </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl text-lg">
                    Détendez-vous avec nos créations exclusives. Une pause stratégique pour booster votre productivité.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {games.map((game, index) => {
                    const Icon = game.icon;
                    return (
                        <div key={game.name} className="group relative">
                            {/* Neon Glow Backdrop */}
                            <div className={cn(
                                "absolute -inset-1 rounded-2xl bg-gradient-to-r opacity-0 blur-lg transition duration-500 group-hover:opacity-40",
                                game.color
                            )} />

                            <Card
                                className={cn(
                                    "relative h-full overflow-hidden border-zinc-800 bg-slate-900/95 backdrop-blur-3xl transition-all duration-300 group-hover:border-white/30 group-hover:translate-y-[-8px] shadow-2xl",
                                    !game.available && "opacity-50 grayscale"
                                )}
                            >
                                <div className="p-8 flex flex-col h-full">
                                    {/* Category Badge */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={cn(
                                            "px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest text-white shadow-xl bg-gradient-to-r",
                                            game.color
                                        )}>
                                            {game.category}
                                        </div>
                                        {game.available ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Disponible</span>
                                                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                            </div>
                                        ) : (
                                            <Sparkles className="h-4 w-4 text-zinc-600" />
                                        )}
                                    </div>

                                    {/* Icon Container - Larger for PC */}
                                    <div className="flex-1 flex flex-col items-center justify-center py-6">
                                        <div className={cn(
                                            "relative p-6 rounded-3xl mb-6 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                            "bg-zinc-800 border border-zinc-700"
                                        )}>
                                            <Icon className="h-16 w-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-primary transition-colors text-center mb-3">
                                            {game.name}
                                        </h3>
                                        <p className="text-sm font-medium text-center text-slate-200 leading-relaxed px-2">
                                            {game.description}
                                        </p>
                                    </div>

                                    {/* Info/Action Footer */}
                                    <div className="mt-8 pt-6 border-t border-zinc-800">
                                        {game.available ? (
                                            <Button asChild className="w-full h-12 bg-primary text-primary-foreground hover:bg-white hover:text-black font-bold text-base transition-all duration-300 shadow-[0_10px_20px_rgba(var(--primary),0.3)]">
                                                <Link href={game.href} className="gap-3">
                                                    <Play className="h-5 w-5 fill-current" />
                                                    LANCER LE JEU
                                                </Link>
                                            </Button>
                                        ) : (
                                            <div className="text-[12px] font-black text-center text-zinc-600 uppercase tracking-[0.2em] py-3 bg-white/5 rounded-xl border border-white/5">
                                                Studio : Bientôt
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>

            {/* Studio Branding Bar */}
            <div className="mt-12 flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-primary/5 via-white/5 to-primary/5 border border-white/10">
                <div className="flex items-center gap-4">
                    <Trophy className="h-10 w-10 text-primary" />
                    <div>
                        <h4 className="font-bold text-white">Leaderboard Global</h4>
                        <p className="text-xs text-muted-foreground">Affrontez les meilleurs entrepreneurs de votre pays.</p>
                    </div>
                </div>
                <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
                    Voir les scores
                </Button>
            </div>
        </div>
    );
}
