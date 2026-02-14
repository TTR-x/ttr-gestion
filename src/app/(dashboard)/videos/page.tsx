
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, HelpCircle, Play, Clock, Tag, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase/config";
import { AppVideo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";

export default function VideosPage() {
    const { isSuperAdmin } = useAuth();
    const [videos, setVideos] = useState<AppVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedVideo, setSelectedVideo] = useState<AppVideo | null>(null);

    const phoneNumber = "+22899974389";
    const whatsappLink = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent("Bonjour, j'ai une question concernant une vidéo sur TTR Gestion.")}`;

    useEffect(() => {
        const videosRef = ref(database, 'videos');

        // Listen for real-time updates
        const unsubscribe = onValue(videosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const videoList: AppVideo[] = Object.entries(data).map(([id, value]: [string, any]) => ({
                    ...value,
                    id
                }));
                // Sort by creation date (newest first)
                videoList.sort((a, b) => b.createdAt - a.createdAt);
                setVideos(videoList);
            } else {
                setVideos([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching videos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const categories = ['all', ...Array.from(new Set(videos.map(v => v.category).filter(Boolean)))];

    const filteredVideos = filter === 'all'
        ? videos
        : videos.filter(v => v.category === filter);

    // Extraction d'ID YouTube améliorée
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const getThumbnail = (video: AppVideo) => {
        if (video.thumbnailUrl) return video.thumbnailUrl;
        const ytId = getYouTubeId(video.videoUrl);
        return ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-semibold tracking-tight flex items-center gap-3">
                        <Video className="h-8 w-8 text-primary" />
                        Tutoriels Vidéos
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        Des guides pas à pas pour maîtriser l'application.
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 animate-pulse">
                            Direct & Sync
                        </Badge>
                    </p>
                </div>
                {isSuperAdmin && (
                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
                        <Link href="https://ttr-moderation.web.app/videos" target="_blank">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Console Modération
                        </Link>
                    </Button>
                )}
            </div>

            {/* Filtres de catégorie */}
            {!loading && videos.length > 0 && categories.length > 2 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.map((cat) => (
                        <Button
                            key={cat}
                            variant={filter === cat ? "default" : "outline"}
                            size="sm"
                            className="rounded-full capitalize px-5"
                            onClick={() => setFilter(cat)}
                        >
                            {cat === 'all' ? 'Toutes les vidéos' : cat}
                        </Button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    [1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse overflow-hidden bg-card/50">
                            <div className="aspect-video bg-muted" />
                            <CardHeader className="space-y-2">
                                <div className="h-5 w-3/4 bg-muted rounded" />
                                <div className="h-4 w-full bg-muted rounded" />
                            </CardHeader>
                        </Card>
                    ))
                ) : filteredVideos.length > 0 ? (
                    filteredVideos.map((video) => (
                        <Card key={video.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-none bg-card/50 backdrop-blur-sm ring-1 ring-border/50 flex flex-col h-full">
                            {/* Card Visual / Thumbnail */}
                            <div
                                className="relative aspect-video overflow-hidden cursor-pointer"
                                onClick={() => setSelectedVideo(video)}
                            >
                                {getThumbnail(video) ? (
                                    <img
                                        src={getThumbnail(video)}
                                        alt={video.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            // Fallback if maxresdefault fails
                                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${getYouTubeId(video.videoUrl)}/mqdefault.jpg`;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <Video className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                )}

                                {/* Hover Play Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="bg-yellow-400 text-black p-4 rounded-full scale-50 group-hover:scale-100 transition-all duration-500 shadow-2xl flex items-center justify-center">
                                        <Play className="h-8 w-8 fill-current ml-1" />
                                    </div>
                                </div>

                                {video.duration && (
                                    <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded flex items-center gap-1 backdrop-blur-md">
                                        <Clock className="h-3 w-3" />
                                        {video.duration}
                                    </div>
                                )}
                            </div>

                            <CardHeader className="pb-3 pt-4 px-6 flex-grow">
                                <div className="flex items-center gap-2 mb-2">
                                    {video.category && (
                                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-primary/5 text-primary border-primary/20">
                                            {video.category}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-xl font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                    {video.title}
                                </CardTitle>
                                <CardDescription className="text-sm line-clamp-3 pt-2 leading-relaxed">
                                    {video.description}
                                </CardDescription>
                            </CardHeader>

                            <CardFooter className="px-6 pb-6 pt-0 flex flex-col gap-3">
                                <Button
                                    className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-11 text-base font-bold"
                                    onClick={() => setSelectedVideo(video)}
                                >
                                    <Play className="h-4 w-4 fill-current" /> Regarder maintenant
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground h-8"
                                    asChild
                                >
                                    <Link href={video.videoUrl} target="_blank">
                                        Ouvrir sur YouTube <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <Card className="col-span-full shadow-lg border-2 border-dashed bg-muted/20">
                        <CardContent className="py-20 text-center">
                            <Video className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-2xl font-bold text-foreground">Aucune vidéo trouvée</h3>
                            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                                {filter === 'all'
                                    ? "Notre bibliothèque est en cours de mise à jour. Revenez très bientôt !"
                                    : `Aucun tutoriel n'est encore disponible dans la catégorie "${filter}".`}
                            </p>
                            {filter !== 'all' && (
                                <Button variant="link" onClick={() => setFilter('all')} className="mt-4">
                                    Voir tout le catalogue
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* In-app Video Player Modal */}
            <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none ring-1 ring-white/10 shadow-3xl">
                    <div className="relative aspect-video w-full bg-black">
                        {selectedVideo && (
                            <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeId(selectedVideo.videoUrl)}?autoplay=1&rel=0&modestbranding=1`}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                    <div className="p-6 bg-card">
                        <DialogHeader className="space-y-1">
                            {selectedVideo?.category && (
                                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                                    {selectedVideo.category}
                                </div>
                            )}
                            <DialogTitle className="text-2xl font-bold leading-tight">
                                {selectedVideo?.title}
                            </DialogTitle>
                            <DialogDescription className="text-sm pt-2 line-clamp-3">
                                {selectedVideo?.description}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-between items-center mt-6 pt-4 border-t">
                            <p className="text-[10px] text-muted-foreground italic flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" /> Source officielle TTR Gestion
                            </p>
                            <Button variant="outline" size="sm" className="gap-2 text-[11px]" asChild>
                                <Link href={selectedVideo?.videoUrl || '#'} target="_blank">
                                    Voir en plein écran sur YouTube <ExternalLink className="h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Card className="mt-16 text-center bg-primary/5 border-primary/20 overflow-hidden relative group">
                <div className="absolute -top-12 -right-12 p-12 opacity-5 pointer-events-none transition-transform duration-1000 group-hover:rotate-45 group-hover:scale-150">
                    <HelpCircle className="h-48 w-48" />
                </div>
                <CardHeader className="relative pt-10">
                    <CardTitle className="text-2xl font-headline flex items-center justify-center gap-3">
                        <HelpCircle className="h-7 w-7 text-primary animate-bounce" />
                        Besoin d'un tutoriel spécifique ?
                    </CardTitle>
                    <CardDescription className="max-w-md mx-auto text-base pt-2">
                        Notre équipe de formation est à votre écoute ! Suggérez-nous un thème et nous créerons la vidéo pour vous.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-12 pt-4 relative">
                    <Button variant="default" size="lg" className="rounded-full px-10 h-14 text-base font-bold shadow-xl shadow-primary/25 hover:scale-105 transition-transform" asChild>
                        <Link href={whatsappLink} target="_blank">
                            <Video className="mr-2 h-5 w-5" />
                            Suggérer un nouveau thème
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
