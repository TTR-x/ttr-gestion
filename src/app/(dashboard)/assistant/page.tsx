
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ThumbsUp, ThumbsDown, Copy, Check, Sparkles, MessageSquare, Bot, LayoutGrid } from "lucide-react";
import { TrixBusinessLogo } from '@/components/icons/trix-business-logo';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { runAssistant, type AssistantInput, type AssistantMessage } from '@/ai/flows/assistant-flow';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { marked } from 'marked';
import { logAiFeedback } from '@/lib/firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

interface Message extends AssistantMessage {
  id: string;
  feedback?: 'like' | 'dislike' | null;
  promptForFeedback?: string;
}

function TrixBusinessChat() {
  const { currentUser, businessProfile, businessId, usageStats, planDetails } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userInitials = getInitials(currentUser?.displayName);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    // Un petit délai permet au DOM de finir son rendu
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Copié !", description: "Le texte a été copié dans votre presse-papiers." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de copier le texte." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const aiLimit = planDetails?.aiQuestions;
    const aiUsed = usageStats?.aiQuestionsUsed || 0;

    if (aiLimit !== 'Illimité' && typeof aiLimit === 'number' && aiUsed >= aiLimit) {
      toast({
        variant: "destructive",
        title: "Limite IA atteinte",
        description: "Vous avez atteint le nombre maximum de questions IA pour votre forfait."
      });
      return;
    }

    const userMessage: Message = { id: uuidv4(), role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Logique pour ne se présenter qu'une fois par semaine
      const introKey = `ttr_last_ai_intro_${currentUser?.uid}`;
      const lastIntro = localStorage.getItem(introKey);
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;

      let skipIntroduction = false;
      if (lastIntro) {
        const lastDate = parseInt(lastIntro, 10);
        if (now - lastDate < oneWeek) {
          skipIntroduction = true;
        }
      }

      const assistantInput: AssistantInput = {
        history: newMessages.map(({ role, content }) => ({ role, content })),
        userDisplayName: currentUser?.displayName || "l'utilisateur",
        businessContext: {
          name: businessProfile?.name || "Mon entreprise",
          type: businessProfile?.type || "Non spécifié",
          country: businessProfile?.country || "Non spécifié",
        },
        skipIntroduction
      };

      if (!skipIntroduction) {
        localStorage.setItem(introKey, now.toString());
      }

      const assistantResponse = await runAssistant(assistantInput);
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantResponse,
        promptForFeedback: currentInput,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling assistant:', error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Désolé, je n'ai pas pu répondre." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.feedback) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback } : m));

    if (businessId && currentUser?.uid && message.promptForFeedback) {
      try {
        await logAiFeedback(businessId, currentUser.uid, {
          prompt: message.promptForFeedback,
          response: message.content,
          feedback,
        });
        toast({ title: "Merci !", description: "Votre retour nous aide à nous améliorer." });
      } catch (err: any) {
        if (!err.message?.includes('PERMISSION_DENIED')) {
          console.error("Failed to log feedback", err);
        }
      }
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12 pb-[400px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center pt-8 md:pt-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="mb-6 relative scale-90 md:scale-100">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <div className="relative bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-primary/10">
                    <TrixBusinessLogo className="h-16 w-16 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent px-4">Comment puis-je vous aider ?</h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-md mb-8 px-6 opacity-80">
                  Votre expert IA personnel pour piloter votre activité.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl px-6">
                  {[
                    { text: "Augmenter mes ventes", icon: Sparkles },
                    { text: "Comprendre le Stock", icon: LayoutGrid },
                    { text: "Rédiger un message client", icon: MessageSquare },
                    { text: "Améliorer ma Trésorerie", icon: Bot }
                  ].map((item) => (
                    <Button
                      key={item.text}
                      variant="outline"
                      className="h-auto py-4 px-5 rounded-2xl border-primary/10 bg-white/50 shadow-sm hover:shadow-md transition-all dark:bg-slate-900 group justify-start overflow-hidden relative"
                      onClick={() => setInput(item.text)}
                    >
                      <item.icon className="mr-3 h-4 w-4 text-primary opacity-60" />
                      <span className="font-semibold text-xs md:text-sm text-left">{item.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {message.role === 'user' ? (
                  <div className="flex flex-col items-end gap-2 mb-10 group px-2 md:px-6">
                    <div className="bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-6 py-4 lg:px-8 lg:py-5 rounded-3xl rounded-tr-sm max-w-[90%] shadow-md">
                      <p className="text-sm md:text-base leading-relaxed font-bold text-slate-900 dark:text-slate-50">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] mb-8">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                          <TrixBusinessLogo className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold tracking-tight">Rapport de TRIX Business</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Analyse Stratégique</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-9 gap-2 rounded-xl"
                          onClick={() => handleCopy(message.id, message.content)}
                        >
                          {copiedId === message.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          <span className="hidden sm:inline">Copier</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8 px-6 md:px-12">
                      <div className="prose prose-slate dark:prose-invert max-w-none 
                                    prose-headings:text-primary prose-headings:font-bold prose-headings:tracking-tight
                                    prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-300
                                    prose-strong:text-slate-900 dark:prose-strong:text-slate-100
                                    prose-li:text-slate-600 dark:prose-li:text-slate-300
                                    prose-hr:border-slate-100 dark:prose-hr:border-slate-800">
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(message.content) as string }} />
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 py-4 px-6 md:px-10">
                      <span className="text-[10px] text-muted-foreground italic tracking-tight">Ce conseil est basé sur vos données actuelles.</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFeedback(message.id, 'like')}
                          disabled={!!message.feedback}
                          className={cn("h-8 w-8 rounded-full", message.feedback === 'like' && 'bg-green-100 dark:bg-green-900/50 text-green-600')}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFeedback(message.id, 'dislike')}
                          disabled={!!message.feedback}
                          className={cn("h-8 w-8 rounded-full", message.feedback === 'dislike' && 'bg-red-100 dark:bg-red-900/50 text-red-600')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in duration-1000">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
                  <div className="relative h-12 w-12 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </div>
                <span className="text-sm font-medium italic text-muted-foreground animate-pulse">TRIX analyse votre demande...</span>
              </div>
            )}
            <div ref={messagesEndRef} className="h-32" />
          </div>
        </ScrollArea>
      </div>

      <div className="fixed bottom-[90px] md:bottom-12 left-0 right-0 px-4 md:px-12 z-[100] animate-in slide-in-from-bottom-5 duration-700 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[2.5rem] p-2 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,1)] ring-1 ring-black/10 dark:ring-white/20 border-t border-white/40 dark:border-white/10">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="relative flex items-center bg-slate-100/50 dark:bg-slate-800/50 border border-black/5 dark:border-white/5 rounded-[2rem] pr-2 shadow-inner flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Posez votre question..."
                  className="bg-transparent border-none rounded-[2rem] text-sm md:text-base resize-none focus-visible:ring-0 min-h-[50px] md:min-h-[60px] py-4 pl-6 pr-12 scrollbar-hide overflow-hidden"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute -right-3 h-9 w-9 md:h-11 md:w-11 rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 shadow-xl text-primary-foreground transition-all active:scale-95 hover:scale-110 z-10"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </form>
          </div>
          <div className="mt-3 text-[9px] text-center text-muted-foreground font-black uppercase tracking-[0.2em] px-4 opacity-30">
            TRIX Expert Connecté
          </div>
        </div>
      </div>
    </div>
  );
}

function MyTrixPanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-background to-muted/20 h-full">
      <div className="bg-card border-2 border-dashed rounded-3xl p-10 max-w-md shadow-lg animate-in fade-in zoom-in duration-500">
        <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-primary">Service Client TRIX</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Nous travaillons sur un tout nouvel espace dédié pour vous accompagner personnellement.
        </p>
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          En cours de développement
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card/30 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 p-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 rotate-[-5deg] group-hover:rotate-0 transition-transform">
            <TrixBusinessLogo className="h-full w-full" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight leading-none flex items-center gap-1.5">
              TRIX <span className="text-primary/70 font-semibold italic text-base">Business</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Assistant Expert Connecté</p>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="trix-business" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-center bg-slate-50/50 dark:bg-slate-900/30 border-b">
          <TabsList className="bg-transparent border-none py-2 h-auto gap-2">
            <TabsTrigger
              value="trix-business"
              className="rounded-xl px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all text-xs font-bold"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" /> IA Assistant
            </TabsTrigger>
            <TabsTrigger
              value="my-trix-panel"
              className="rounded-xl px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all text-xs font-bold"
            >
              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Support Direct
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="trix-business" className="flex-1 mt-0 overflow-hidden relative border-none p-0 outline-none">
          <TrixBusinessChat />
        </TabsContent>
        <TabsContent value="my-trix-panel" className="flex-1 mt-0 overflow-hidden outline-none">
          <MyTrixPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
