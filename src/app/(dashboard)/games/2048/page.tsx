
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCw, Trophy, Target, Zap } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

const GRID_SIZE = 4;

const initializeBoard = (): number[][] => {
  const newBoard = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  addRandomTile(newBoard);
  addRandomTile(newBoard);
  return newBoard;
};

const addRandomTile = (board: number[][]) => {
  const emptyTiles: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) emptyTiles.push({ r, c });
    }
  }
  if (emptyTiles.length > 0) {
    const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
};

const getTileGradient = (value: number) => {
  const gradients: Record<number, string> = {
    2: "from-zinc-100 to-zinc-300 text-zinc-900 border-zinc-200/50",
    4: "from-zinc-200 to-zinc-400 text-zinc-900 border-zinc-300/50",
    8: "from-orange-400 to-orange-600 text-white border-orange-400/50 shadow-[0_0_15px_rgba(251,146,60,0.3)]",
    16: "from-orange-500 to-red-600 text-white border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]",
    32: "from-red-500 to-rose-700 text-white border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
    64: "from-red-600 to-purple-800 text-white border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.5)]",
    128: "from-yellow-300 to-amber-500 text-white border-yellow-200/50 shadow-[0_0_25px_rgba(253,224,71,0.5)]",
    256: "from-yellow-400 to-amber-600 text-white border-yellow-300/50 shadow-[0_0_30px_rgba(250,204,21,0.6)]",
    512: "from-yellow-500 to-amber-700 text-white border-yellow-400/50 shadow-[0_0_35px_rgba(234,179,8,0.6)]",
    1024: "from-cyan-400 to-blue-600 text-white border-cyan-300/50 shadow-[0_0_40px_rgba(34,211,238,0.7)] text-xl",
    2048: "from-violet-500 to-fuchsia-700 text-white border-violet-400/50 shadow-[0_0_50px_rgba(168,85,247,0.8)] text-xl",
  };
  return gradients[value] || "bg-zinc-800/50 border-white/5";
};

export default function Game2048Page() {
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  // Initial Load
  useEffect(() => {
    setBoard(initializeBoard());
    const savedBest = localStorage.getItem('2048_best_score');
    if (savedBest) setBestScore(parseInt(savedBest));
  }, []);

  // Save Best Score
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048_best_score', score.toString());
    }
  }, [score, bestScore]);

  const startNewGame = useCallback(() => {
    setBoard(initializeBoard());
    setScore(0);
    setIsGameOver(false);
    setHasWon(false);
  }, []);

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isGameOver) return;

    let tempBoard = board.map(row => [...row]);
    let newPoints = 0;
    let won = false;

    const slideAndMerge = (row: number[]): { newRow: number[], points: number } => {
      const filtered = row.filter(tile => tile !== 0);
      const merged = [];
      let points = 0;
      for (let i = 0; i < filtered.length; i++) {
        if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
          const mergedValue = filtered[i] * 2;
          merged.push(mergedValue);
          points += mergedValue;
          if (mergedValue === 2048) won = true;
          i++;
        } else {
          merged.push(filtered[i]);
        }
      }
      while (merged.length < GRID_SIZE) merged.push(0);
      return { newRow: merged, points };
    };

    const rotateRight = (mat: number[][]) => mat[0].map((_, c) => mat.map(r => r[c]).reverse());

    let rotations = direction === 'up' ? 1 : direction === 'right' ? 2 : direction === 'down' ? 3 : 0;
    for (let i = 0; i < rotations; i++) tempBoard = rotateRight(tempBoard);

    for (let r = 0; r < GRID_SIZE; r++) {
      const { newRow, points } = slideAndMerge(tempBoard[r]);
      tempBoard[r] = newRow;
      newPoints += points;
    }

    for (let i = 0; i < (4 - rotations) % 4; i++) tempBoard = rotateRight(tempBoard);

    const boardChanged = JSON.stringify(board) !== JSON.stringify(tempBoard);

    if (boardChanged) {
      addRandomTile(tempBoard);
      setBoard(tempBoard);
      setScore(p => p + newPoints);
      if (won) setHasWon(true);

      // Check Game Over
      let canMove = false;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (tempBoard[r][c] === 0) canMove = true;
          if (r < GRID_SIZE - 1 && tempBoard[r][c] === tempBoard[r + 1][c]) canMove = true;
          if (c < GRID_SIZE - 1 && tempBoard[r][c] === tempBoard[r][c + 1]) canMove = true;
        }
      }
      if (!canMove) setIsGameOver(true);
    }
  }, [board, isGameOver]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  };

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowUp') move('up');
      if (e.key === 'ArrowDown') move('down');
      if (e.key === 'ArrowLeft') move('left');
      if (e.key === 'ArrowRight') move('right');
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [move]);

  return (
    <div className="flex flex-col space-y-8 max-w-2xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
            <Link href="/games"><ArrowLeft className="h-5 w-5 text-white" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">2048 <span className="text-primary not-italic">PRO</span></h1>
            <p className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase">Game Studio Edition</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-3 px-6 text-center">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Score</p>
            <p className="text-2xl font-black text-white">{score}</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 px-6 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1"><Trophy className="h-3 w-3 text-primary opacity-50" /></div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Best</p>
            <p className="text-2xl font-black text-white">{bestScore}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Game Board */}
        <div className="lg:col-span-8">
          <div
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="relative p-3 rounded-[32px] bg-zinc-900/80 border-4 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] aspect-square overflow-hidden select-none"
          >
            {/* Game Over / Win Overlay */}
            {(isGameOver || hasWon) && (
              <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="p-4 rounded-full bg-primary/20 mb-6 ring-4 ring-primary/40">
                  {hasWon ? <Zap className="h-12 w-12 text-primary animate-bounce" /> : <Target className="h-12 w-12 text-red-500" />}
                </div>
                <h2 className="text-5xl font-black text-white mb-2 uppercase italic tracking-tighter">
                  {hasWon ? "Victoire !" : "Game Over"}
                </h2>
                <p className="text-zinc-400 font-bold mb-8">
                  {hasWon ? "Vous avez atteint 2048. Impressionnant !" : `Score Final : ${score}`}
                </p>
                <Button onClick={startNewGame} size="lg" className="w-full h-14 text-xl font-black bg-white text-black hover:bg-primary hover:text-white transition-all rounded-2xl group">
                  <RotateCw className="mr-3 h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
                  REESSAYER
                </Button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 h-full">
              {board.length > 0 && board.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={cn(
                      "relative flex items-center justify-center text-4xl font-black rounded-2xl border-2 transition-all duration-200",
                      getTileGradient(cell)
                    )}
                  >
                    {cell !== 0 && (
                      <span className="scale-100 animate-in zoom-in-75 duration-200 drop-shadow-md">
                        {cell}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Button onClick={startNewGame} variant="outline" className="h-16 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black tracking-widest">
            <RotateCw className="mr-3 h-5 w-5" /> REINITIALISER
          </Button>

          <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h4 className="font-black text-white uppercase tracking-tighter">Instructions</h4>
            </div>
            <ul className="space-y-3">
              {[
                "Utilisez les flèches ou glissez sur l'écran.",
                "Fusionnez les nombres identiques.",
                "Atteignez la tuile 2048 pour gagner.",
                "Chaque mouvement compte pour le score."
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm font-bold text-zinc-400 leading-tight">
                  <span className="text-primary">{i + 1}.</span> {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
