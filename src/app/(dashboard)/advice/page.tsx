"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, RotateCw, Quote } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Advice {
  text: string;
  author: string;
}

const proverbs: Advice[] = [
    { text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
    { text: "Le succès, c'est tomber sept fois et se relever huit.", author: "Proverbe japonais" },
    { text: "Celui qui déplace une montagne commence par emporter de petites pierres.", author: "Confucius" },
    { text: "Ne jugez pas chaque jour sur ce que vous récoltez, mais sur les graines que vous semez.", author: "Robert Louis Stevenson" },
    { text: "La patience est un arbre dont la racine est amère, mais dont les fruits sont très doux.", author: "Proverbe persan" },
];

export default function AdvicePage() {
  const { businessProfile } = useAuth();
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdvice = useCallback(() => {
    setLoading(true);
    const randomIndex = Math.floor(Math.random() * proverbs.length);
    setTimeout(() => {
        setAdvice(proverbs[randomIndex]);
        setLoading(false);
    }, 500); // Simulate network latency
  }, []);

  useEffect(() => {
    fetchAdvice();
  }, [fetchAdvice]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Conseils et Inspirations</h1>
        <Button onClick={fetchAdvice} disabled={loading}>
          <RotateCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Générer un autre conseil
        </Button>
      </div>
      
      <Card className="shadow-lg min-h-[250px] flex items-center justify-center">
        <CardContent className="p-6 text-center">
          {loading ? (
            <div className="space-y-4">
                <Quote className="mx-auto h-12 w-12 text-primary/20" />
                <Skeleton className="h-6 w-80 mx-auto" />
                <Skeleton className="h-6 w-64 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto mt-4" />
            </div>
          ) : advice ? (
             <div className="animate-in fade-in duration-500">
                <Quote className="mx-auto h-12 w-12 text-primary/20" />
                <blockquote className="mt-4 text-2xl font-semibold leading-relaxed">
                  “{advice.text}”
                </blockquote>
                <p className="text-right mt-6 font-medium text-lg text-primary">
                  — {advice.author}
                </p>
             </div>
          ) : (
            <p>Impossible de charger un conseil pour le moment.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="text-yellow-400" /> Sagesse pour votre quotidien</CardTitle>
          <CardDescription>Nos conseils sont générés par IA pour vous offrir une perspective nouvelle et adaptée à votre activité. N'hésitez pas à en générer plusieurs pour trouver l'inspiration !</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
