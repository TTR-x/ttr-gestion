
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCw, Undo, Trophy, Brain, User, History, Zap } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useAuth } from '@/providers/auth-provider';

// Basic Piece Values for TRIX
const PIECE_VALUES: Record<string, number> = {
  p: 10, n: 30, b: 30, r: 50, q: 90, k: 900
};

// --- TRIX LOGIC (Simple Minimax) ---
const evaluateBoard = (game: Chess) => {
  let totalEvaluation = 0;
  const board = game.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const value = PIECE_VALUES[piece.type] || 0;
        totalEvaluation += (piece.color === 'w' ? value : -value);
      }
    }
  }
  return totalEvaluation;
};

const minimax = (game: Chess, depth: number, isMaximizing: boolean): number => {
  if (depth === 0) return -evaluateBoard(game);
  const possibleMoves = game.moves();
  if (isMaximizing) {
    let bestScore = -9999;
    for (const move of possibleMoves) {
      game.move(move);
      bestScore = Math.max(bestScore, minimax(game, depth - 1, !isMaximizing));
      game.undo();
    }
    return bestScore;
  } else {
    let bestScore = 9999;
    for (const move of possibleMoves) {
      game.move(move);
      bestScore = Math.min(bestScore, minimax(game, depth - 1, !isMaximizing));
      game.undo();
    }
    return bestScore;
  }
};

const getBestMove = (game: Chess) => {
  const possibleMoves = game.moves();
  if (possibleMoves.length === 0) return null;

  let bestMove = null;
  let bestValue = -9999;

  for (const move of possibleMoves) {
    game.move(move);
    const boardValue = minimax(game, 2, false);
    game.undo();
    if (boardValue > bestValue) {
      bestValue = boardValue;
      bestMove = move;
    }
  }
  return bestMove;
};

export default function ChessGamePage() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [status, setStatus] = useState("À vous de jouer");
  const [difficulty, setDifficulty] = useState<'facile' | 'normal'>('normal');

  const { currentUser } = useAuth();
  const playerName = currentUser?.displayName || "Joueur";

  const makeAMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      if (result) {
        setGame(new Chess(game.fen()));
        setMoveHistory(h => [...h, result.san]);
        return true;
      }
    } catch (e) { return false; }
    return false;
  }, [game]);

  const makeComputerMove = useCallback(() => {
    if (game.isGameOver()) return;

    setTimeout(() => {
      const bestMove = getBestMove(game);
      if (bestMove) {
        makeAMove(bestMove);
      }
    }, 500);
  }, [game, makeAMove]);

  useEffect(() => {
    if (game.turn() === 'b' && !game.isGameOver()) {
      setStatus("Réflexion de TRIX...");
      makeComputerMove();
    } else if (game.isCheckmate()) {
      setStatus("Échec et mat !");
      setIsGameOver(true);
    } else if (game.isDraw()) {
      setStatus("Match nul");
      setIsGameOver(true);
    } else {
      setStatus("À vous de jouer");
    }
  }, [game, makeComputerMove]);

  function onPieceDrop(sourceSquare: string, targetSquare: string) {
    if (game.turn() === 'b') return false;

    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    return move;
  }

  const resetGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
    setIsGameOver(false);
  };

  const undoMove = () => {
    game.undo(); // Undo AI
    game.undo(); // Undo Player
    setGame(new Chess(game.fen()));
    setMoveHistory(h => h.slice(0, -2));
  };

  return (
    <div className="flex flex-col space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
            <Link href="/games"><ArrowLeft className="h-5 w-5 text-white" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">CHESS <span className="text-primary not-italic">TRIX</span></h1>
            <p className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase">Grandmaster Engine v1.2</p>
          </div>
        </div>

        <div className="hidden sm:flex p-1 bg-zinc-900 border border-white/5 rounded-xl">
          <Button
            variant={difficulty === 'facile' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDifficulty('facile')}
            className="rounded-lg text-[10px] font-black uppercase"
          >Novice</Button>
          <Button
            variant={difficulty === 'normal' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDifficulty('normal')}
            className="rounded-lg text-[10px] font-black uppercase"
          >Expert</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Chess Board */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="relative p-6 rounded-[32px] bg-zinc-900/80 border-4 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Game Over Overlay */}
            {isGameOver && (
              <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="p-4 rounded-full bg-primary/20 mb-6 ring-4 ring-primary/40 text-primary">
                  <Trophy className="h-12 w-12" />
                </div>
                <h2 className="text-5xl font-black text-white mb-2 uppercase italic tracking-tighter">
                  {status}
                </h2>
                <Button onClick={resetGame} size="lg" className="mt-8 h-14 px-12 text-xl font-black bg-white text-black hover:bg-primary hover:text-white transition-all rounded-2xl">
                  REVANCHE
                </Button>
              </div>
            )}

            <div className="aspect-square max-w-[500px] mx-auto">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onPieceDrop}
                boardOrientation="white"
                customDarkSquareStyle={{ backgroundColor: '#18181b' }}
                customLightSquareStyle={{ backgroundColor: '#3f3f46' }}
                customBoardStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                }}
                animationDuration={300}
              />
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Status Card */}
          <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase">Joueur</p>
                  <p className="font-bold text-white">{playerName}</p>
                </div>
              </div>
              <Zap className="h-5 w-5 text-zinc-700" />
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase">Intelligence</p>
                  <p className="font-bold text-primary">TRIX Engine</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            <div className={cn(
              "w-full py-4 px-6 rounded-2xl text-center font-black uppercase tracking-widest text-sm mb-4",
              game.turn() === 'w' ? "bg-white text-black" : "bg-primary text-black animate-pulse"
            )}>
              {status}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={resetGame} variant="outline" className="h-12 border-white/10 hover:bg-white/5 text-xs font-black">
                <RotateCw className="mr-2 h-4 w-4" /> NOUVEAU
              </Button>
              <Button onClick={undoMove} variant="outline" className="h-12 border-white/10 hover:bg-white/5 text-xs font-black" disabled={moveHistory.length === 0}>
                <Undo className="mr-2 h-4 w-4" /> ANNULER
              </Button>
            </div>
          </div>

          {/* History Card */}
          <div className="flex-1 p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-zinc-500" />
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Historique</h4>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {moveHistory.map((move, i) => (
                <div key={i} className="bg-zinc-800/50 p-2 rounded-lg text-center text-[10px] font-bold text-zinc-300 border border-white/5">
                  {Math.floor(i / 2) + 1}.{i % 2 === 0 ? 'W' : 'B'} {move}
                </div>
              ))}
              {moveHistory.length === 0 && <p className="col-span-4 text-center py-8 text-xs text-zinc-600 font-bold italic">Aucun coup joué</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
