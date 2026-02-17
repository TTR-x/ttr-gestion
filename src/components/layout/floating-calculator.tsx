"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calculator as CalculatorIcon, X, Package, Megaphone, ArrowLeft, Grip, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { ReceiptDialog } from '@/components/receipt/receipt-dialog';

export function FloatingCalculator() {
  const { state, isMobile } = useSidebar();
  const { pendingReceipts, businessProfile, getCurrencySymbol } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [isResult, setIsResult] = useState(false);
  const [mode, setMode] = useState<'menu' | 'calculator'>('menu');
  const router = useRouter();
  const pathname = usePathname();
  const [showTutorial, setShowTutorial] = useState(false);
  const [mounted, setMounted] = useState(false);

  // New state for modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // New state for Flash Button animation
  const [isFlashNavigating, setIsFlashNavigating] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevReceiptCountRef = React.useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const views = parseInt(localStorage.getItem('ttr-floating-tutorial-views') || '0', 10);
      if (views < 3) {
        // Slight delay to appear after animation
        const timer = setTimeout(() => setShowTutorial(true), 500);
        return () => clearTimeout(timer);
      }
    } else {
      setShowTutorial(false);
    }
  }, [isOpen]);

  const dismissTutorial = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowTutorial(false);
    const currentViews = parseInt(localStorage.getItem('ttr-floating-tutorial-views') || '0', 10);
    localStorage.setItem('ttr-floating-tutorial-views', (currentViews + 1).toString());
  };

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);
  const lastPositionRef = React.useRef<{ x: number; y: number } | null>(null);

  // Reset mode when closing
  useEffect(() => {
    if (!isOpen) setMode('menu');
  }, [isOpen]);

  // Ensure calculator stays within viewport when opened
  useEffect(() => {
    if (isOpen && cardRef.current && !position) {
      // Small delay to let the card render first
      const timer = setTimeout(() => {
        const card = cardRef.current;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Only adjust if calculator is partially or fully off-screen
        if (rect.right > viewportWidth || rect.left < 0 || rect.bottom > viewportHeight || rect.top < 0) {
          const safeX = Math.max(0, Math.min(rect.left, viewportWidth - rect.width));
          const safeY = Math.max(0, Math.min(rect.top, viewportHeight - rect.height));
          setPosition({ x: safeX, y: safeY });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, position]);


  // L'effet de reset automatique de position a été supprimé pour permettre le déplacement libre sur PC.


  // Handle Flash Navigation State
  useEffect(() => {
    if (isFlashNavigating && pathname === '/overview') {
      // We arrived at the dashboard
      // Wait a bit for the page to render and the "spin" to be appreciated
      const timer = setTimeout(() => {
        const element = document.getElementById('quick-sales-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsFlashNavigating(false);
        setIsOpen(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pathname, isFlashNavigating]);

  // Auto-open menu when new receipt is added with stylish animation
  // Auto-open menu when new receipt is added with stylish animation
  const autoCloseTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const startAutoCloseTimer = () => {
    if (autoCloseTimeoutRef.current) clearTimeout(autoCloseTimeoutRef.current);

    autoCloseTimeoutRef.current = setTimeout(() => {
      // Add closing animation class before actually closing
      if (cardRef.current) {
        cardRef.current.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        cardRef.current.style.opacity = '0';
        cardRef.current.style.transform = 'translateX(100%) scale(0.8)';
      }

      // Actually close after animation completes
      setTimeout(() => {
        setIsOpen(false);
        // Reset styles for next open
        if (cardRef.current) {
          cardRef.current.style.opacity = '';
          cardRef.current.style.transform = '';
        }
      }, 800);
    }, 6000); // 6 seconds delay
  };

  const stopAutoCloseTimer = () => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const currentCount = pendingReceipts?.length || 0;
    const prevCount = prevReceiptCountRef.current;

    // If receipt count increased (new receipt added)
    if (currentCount > prevCount && currentCount > 0) {
      // Trigger pulse animation on Flash button
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);

      // Check user preference for auto-open
      const autoOpenPref = localStorage.getItem('ttr-settings-auto-open-edge');
      const shouldAutoOpen = autoOpenPref === null || autoOpenPref === 'true';

      if (shouldAutoOpen) {
        // Auto-open the menu after a short delay
        setTimeout(() => {
          setIsOpen(true);
          setMode('menu');
        }, 300);
      }

      // Start auto-close timer (still useful if manually opened later, or if we want to ensure it closes eventually)
      // But strictly speaking, if it doesn't open, we don't need to auto-close it.
      // However, if the user opens it manually to check, the timer might be nice.
      // Let's keep it tied to the "new receipt event" context.
      if (shouldAutoOpen) {
        startAutoCloseTimer();
      }
    }

    prevReceiptCountRef.current = currentCount;

    return () => stopAutoCloseTimer();
  }, [pendingReceipts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || mode !== 'calculator') return;
      if (event.key >= '0' && event.key <= '9') {
        handleDigitClick(event.key);
      } else if (['+', '-', '*', '/'].includes(event.key)) {
        handleOperatorClick(event.key);
      } else if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault();
        handleEqualClick();
      } else if (event.key === 'Backspace') {
        handleClearClick('backspace');
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      } else if (event.key === '.') {
        handleDigitClick('.');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, isResult, mode]);

  // Handle Dragging
  const hasMoved = React.useRef(false);
  const [isOverDragTrash, setIsOverDragTrash] = useState(false);
  const isOverTrashRef = React.useRef(false);
  // supprimé les déclarations dupliquées de dragOffset et lastPositionRef ici car elles sont en haut du composant

  useEffect(() => {
    if (!isDragging) return;

    // Bloquer le scroll du body pendant le drag pour éviter que l'écran ne bouge
    document.body.style.overflow = 'hidden';

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      hasMoved.current = true;

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      let newX = clientX - dragOffset.current.x;
      let newY = clientY - dragOffset.current.y;

      // Utilisation du VisualViewport pour mobile (Zone Invisible de contrainte)
      const screenWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const screenHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const offsetLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;
      const offsetTop = window.visualViewport ? window.visualViewport.offsetTop : 0;

      const cardRect = cardRef.current?.getBoundingClientRect();
      const cardWidth = cardRect?.width || 0;
      const cardHeight = cardRect?.height || 0;

      // Clamping strict tenant compte du zoom/viewport mobile
      // On s'assure que newX est entre offsetLeft et (offsetLeft + screenWidth - cardWidth)
      const minX = offsetLeft;
      const maxX = offsetLeft + screenWidth - cardWidth;
      const minY = offsetTop;
      const maxY = offsetTop + screenHeight - cardHeight;

      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      if (cardRef.current) {
        cardRef.current.style.left = `${newX}px`;
        cardRef.current.style.top = `${newY}px`;
      }

      // Trash detection logic...
      const trashThreshold = 100;
      const trashX = offsetLeft + screenWidth / 2; // Centré par rapport au viewport visible
      const trashY = offsetTop + 80;

      if (cardWidth > 0) {
        const cardCenterX = newX + cardWidth / 2;
        const cardCenterY = newY + cardHeight / 2;
        const dist = Math.sqrt(Math.pow(cardCenterX - trashX, 2) + Math.pow(cardCenterY - trashY, 2));
        const isOver = dist < trashThreshold;

        if (isOver !== isOverTrashRef.current) {
          isOverTrashRef.current = isOver;
          setIsOverDragTrash(isOver);
          if (cardRef.current) cardRef.current.style.opacity = isOver ? '0.5' : '1';
        }
      }

      lastPositionRef.current = { x: newX, y: newY };
    };

    const handleUp = () => {
      setIsDragging(false);
      document.body.style.overflow = ''; // Restaurer le scroll

      if (isOverTrashRef.current) {
        setIsOpen(false);
        setIsOverDragTrash(false);
        isOverTrashRef.current = false;
        setPosition(null);
        setMode('menu');
      } else if (lastPositionRef.current) {
        const screenWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const offsetLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;
        const cardRect = cardRef.current?.getBoundingClientRect();
        const cardWidth = cardRect?.width || 0;

        let finalX = lastPositionRef.current.x;
        let finalY = lastPositionRef.current.y;

        // Snap logic adjusted for visual viewport
        const centerX = offsetLeft + screenWidth / 2;

        if (finalX + cardWidth / 2 < centerX) {
          finalX = offsetLeft; // Snap left (taking viewport offset into account)
        } else {
          finalX = offsetLeft + screenWidth - cardWidth; // Snap right
        }

        setPosition({ x: finalX, y: finalY });
      }
      if (cardRef.current) cardRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    hasMoved.current = false;
    const target = e.currentTarget as HTMLElement;
    const card = target.closest('.floating-calculator-card');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    const startX = rect.left;
    const startY = rect.top;

    if (!position) {
      setPosition({ x: startX, y: startY });
    }
    lastPositionRef.current = { x: startX, y: startY };
    setIsDragging(true);
  };

  const safeCalculate = (expression: string) => {
    try {
      if (/[^0-9+\-*/().\s]/.test(expression)) return "Erreur";
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + expression)();
      if (!isFinite(result) || isNaN(result)) return "Erreur";
      return String(Math.round(result * 10000000) / 10000000);
    } catch {
      return "Erreur";
    }
  };

  const handleDigitClick = (digit: string) => {
    if (isResult) {
      setDisplay(digit);
      setIsResult(false);
    } else {
      setDisplay(prev => prev === '0' && digit !== '.' ? digit : prev + digit);
    }
  };

  const handleOperatorClick = (op: string) => {
    if (isResult) {
      const parts = display.split('=');
      const lastResult = parts[parts.length - 1].trim();
      setDisplay(lastResult + op);
      setIsResult(false);
    } else {
      setDisplay(prev => {
        const trimmed = prev.trim();
        if (['+', '-', '*', '/'].some(o => trimmed.endsWith(o))) {
          return trimmed.slice(0, -1) + op;
        }
        return prev + op;
      });
    }
  };

  const handleEqualClick = () => {
    if (isResult) return;
    const result = safeCalculate(display);
    setDisplay(prev => `${prev} = ${result}`);
    setIsResult(true);
  };

  const handleClearClick = (type: 'all' | 'backspace') => {
    if (type === 'all') {
      setDisplay('0');
      setIsResult(false);
    } else {
      if (isResult) {
        setDisplay('0');
        setIsResult(false);
      } else {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      }
    }
  };

  const handleQuickSaleClick = () => {
    if (pendingReceipts.length > 0) {
      setIsOpen(false);
      setIsReceiptOpen(true);
    } else if (pathname === '/overview') {
      setIsOpen(false);
      const element = document.getElementById('quick-sales-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setIsFlashNavigating(true);
      router.push('/overview');
    }
  };

  const getReceiptData = () => {
    if (!pendingReceipts) return null;
    const totalAmount = pendingReceipts.reduce((sum, item) => item.type !== 'expense' ? sum + item.amount : sum, 0);
    const totalPaid = pendingReceipts.reduce((sum, item) => sum + item.amount, 0);

    return {
      id: `combined-${Date.now()}`,
      date: new Date(),
      customerName: "Client de passage",
      items: pendingReceipts.map(r => ({
        name: r.description,
        description: r.description,
        quantity: 1,
        price: r.type === 'expense' ? -r.amount : r.amount,
      })),
      totalAmount: totalAmount,
      amountPaid: totalPaid,
      notes: "Ceci est un résumé de plusieurs transactions rapides.",
    };
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed top-12 left-1/2 -translate-x-1/2 z-[10000] transition-all duration-300 pointer-events-none flex flex-col items-center justify-center gap-2",
          isDragging ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10",
          isOverDragTrash && "scale-125"
        )}
      >
        <div className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 backdrop-blur-sm border-2",
          isOverDragTrash
            ? "bg-destructive/90 border-destructive text-white shadow-destructive/50"
            : "bg-background/80 border-muted-foreground/20 text-muted-foreground"
        )}>
          <X className={cn("h-8 w-8", isOverDragTrash && "animate-pulse")} />
        </div>
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded bg-background/80",
          isOverDragTrash ? "text-destructive" : "text-muted-foreground"
        )}>
          Fermer
        </span>
      </div>

      {!isOpen && (
        <div
          className={cn(
            "fixed top-1/2 -translate-y-1/2 z-[40] group flex items-center w-8 h-40 touch-none py-4 transition-all duration-300 select-none",
            "right-0 justify-end pl-4 cursor-grab active:cursor-grabbing"
          )}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const handleMouseUp = (e: MouseEvent) => {
              const diff = startX - e.clientX;
              if (Math.abs(diff) < 5 || diff > 30) {
                setIsOpen(true);
              }
              window.removeEventListener('mouseup', handleMouseUp);
            };
            window.addEventListener('mouseup', handleMouseUp, { once: true });
          }}
          onTouchStart={(e) => {
            const touch = e.currentTarget.dataset;
            // @ts-ignore
            touch.startX = String(e.touches[0].clientX);
          }}
          onTouchEnd={(e) => {
            // @ts-ignore
            const startX = parseFloat(e.currentTarget.dataset.startX || '0');
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (diff > 30 || Math.abs(diff) < 5) {
              setIsOpen(true);
            }
            // @ts-ignore
            e.currentTarget.dataset.startX = '';
          }}
        >
          <div className={cn(
            "h-24 w-1.5 bg-blue-500/80 hover:bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-300 transform group-hover:w-2",
            "rounded-l-full translate-x-0.5 group-hover:translate-x-0"
          )} />
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-bold text-blue-600 bg-white/90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap",
            "right-full mr-1"
          )}>
            Ouvrir
          </div>
        </div>
      )}

      {isOpen && (
        <Card
          ref={cardRef}
          className={cn(
            'fixed z-[40] shadow-2xl floating-calculator-card transition-[width,height] ease-in-out',
            mode === 'menu' ? 'rounded-3xl' : 'rounded-xl',
            !position && (
              mode === 'menu' ? 'top-1/2 -translate-y-1/2 rounded-r-none rounded-l-3xl border-r-0' : 'top-1/2 -translate-y-1/2'
            )
          )}
          style={{
            ...(position ? {
              top: position.y,
              left: position.x,
              margin: 0,
            } : {
              // Position initiale sûre à droite avec marge - garantie dans le viewport
              top: '50%',
              right: mode === 'menu' ? '0' : 'max(1rem, env(safe-area-inset-right, 1rem))',
              left: 'auto',
            }),
            width: mode === 'menu' ? '4rem' : (isMobile ? 'calc(100vw - 2rem)' : 'min(20rem, calc(100vw - 2rem))'),
            maxWidth: 'calc(100vw - 1rem)',
            transform: !position ? 'translateY(-50%)' : 'none',
            animation: !position && !isDragging ? 'slideInFromRightSmooth 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            transition: isDragging
              ? 'none' // Réponse instantanée 1:1 sans délai (comme YouTube)
              : 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', // Effet rebond élastique au relâchement
            // Optimisation GPU
            willChange: isDragging ? 'left, top' : 'auto',
          }}
        >
          <CardHeader
            className={cn(
              "p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 cursor-move select-none active:cursor-grabbing border-b transition-all duration-300",
              mode === 'menu' ? "justify-center" : "justify-between"
            )}
            style={{ touchAction: 'none' }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onMouseEnter={stopAutoCloseTimer}
          >
            {mode === 'calculator' ? (
              <div className="flex justify-between items-center w-full pointer-events-none">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 pointer-events-auto mr-1 -ml-1"
                    onClick={() => setMode('menu')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  Calculatrice
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 pointer-events-auto hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 relative">
                {showTutorial && (
                  <div className="absolute right-full top-0 mr-4 w-56 bg-primary text-primary-foreground p-4 rounded-xl shadow-xl animate-in fade-in slide-in-from-right-2 z-50 pointer-events-auto border-2 border-white/20">
                    <div className="absolute top-2 -right-1.5 w-3 h-3 bg-primary rotate-45 border-t-2 border-r-2 border-white/20" />
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-bold flex items-center gap-2">
                        <span>✨ Menu Rapide</span>
                      </p>
                      <p className="text-xs leading-relaxed opacity-90">
                        <strong>Glissez la poignée</strong> pour ouvrir ce menu n'importe où.
                      </p>
                      <ul className="text-xs list-disc pl-4 space-y-1 opacity-90">
                        <li>Déplacez ce menu où vous voulez</li>
                        <li>Ventes, Stock & Publicité</li>
                      </ul>
                    </div>
                    <Button size="sm" variant="secondary" className="h-7 text-xs w-full mt-3 hover:bg-secondary/90 font-semibold" onClick={dismissTutorial}>C'est noté !</Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 pointer-events-auto group relative"
                  onClick={() => {
                    dismissTutorial();
                    if (!hasMoved.current) setIsOpen(false);
                  }}
                  title="Déplacer ou Fermer"
                >
                  <Grip className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:opacity-0 group-hover:scale-75 animate-pulse" />
                  <X className="absolute inset-0 m-auto h-4 w-4 text-destructive scale-75 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100" />
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent
            className={cn("p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", mode === 'menu' ? "p-1" : "p-4")}
            onMouseEnter={stopAutoCloseTimer}
          >
            {mode === 'menu' ? (
              <div className="flex flex-col gap-4 items-center py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 hover:scale-110 transition-transform shadow-sm"
                  onClick={() => setMode('calculator')}
                  title="Calculatrice"
                >
                  <CalculatorIcon className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full hover:scale-110 transition-all duration-300 shadow-sm relative overflow-visible",
                    isFlashNavigating
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 animate-spin"
                      : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300",
                    isPulsing && "animate-pulse scale-125 shadow-lg ring-4 ring-yellow-400/50"
                  )}
                  onClick={handleQuickSaleClick}
                  title="Vente Rapide"
                >
                  <div className="relative flex items-center justify-center w-full h-full">
                    {pendingReceipts && pendingReceipts.length > 0 ? (
                      <>
                        <Zap className="h-5 w-5 opacity-20" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-yellow-700 dark:text-yellow-400">
                          {pendingReceipts.length}
                        </span>
                      </>
                    ) : (
                      <Zap className="h-5 w-5" />
                    )}
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 hover:scale-110 transition-transform shadow-sm"
                  onClick={() => { setIsOpen(false); router.push('/stock'); }}
                  title="Stock"
                >
                  <Package className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300 hover:scale-110 transition-transform shadow-sm"
                  onClick={() => { setIsOpen(false); router.push('/publicity'); }}
                  title="Publicité"
                >
                  <Megaphone className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted text-right text-xl font-mono p-4 rounded-md mb-4 break-words min-h-[4rem] flex items-center justify-end shadow-inner">
                  {display}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" className="col-span-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleClearClick('all')}>AC</Button>
                  <Button variant="outline" onClick={() => handleClearClick('backspace')}>C</Button>
                  <Button variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => handleOperatorClick('/')}>÷</Button>

                  <Button variant="outline" onClick={() => handleDigitClick('7')}>7</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('8')}>8</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('9')}>9</Button>
                  <Button variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => handleOperatorClick('*')}>×</Button>

                  <Button variant="outline" onClick={() => handleDigitClick('4')}>4</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('5')}>5</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('6')}>6</Button>
                  <Button variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => handleOperatorClick('-')}>-</Button>

                  <Button variant="outline" onClick={() => handleDigitClick('1')}>1</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('2')}>2</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('3')}>3</Button>
                  <Button variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => handleOperatorClick('+')}>+</Button>

                  <Button variant="outline" className="col-span-2" onClick={() => handleDigitClick('0')}>0</Button>
                  <Button variant="outline" onClick={() => handleDigitClick('.')}>.</Button>
                  <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={handleEqualClick}>=</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {businessProfile && (
        <ReceiptDialog
          isOpen={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          data={getReceiptData()}
          businessProfile={businessProfile}
          currencySymbol={getCurrencySymbol ? getCurrencySymbol() : '€'}
          type="other"
          title="Aperçu du Reçu Combiné"
        />
      )}
    </>,
    document.body
  );
}
