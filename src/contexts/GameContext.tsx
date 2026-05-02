'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Game } from '@/lib/game';

interface GameContextType {
  game: Game | null;
  refreshTrigger: number;
  startNewGame: () => void;
  advanceTick: () => void;
  buyStock: (ticker: string, amount: number) => boolean;
  sellStock: (ticker: string, amount: number) => boolean;
  answerCall: (responseChoice?: string) => void;
  ignoreCall: () => void;
  makeCall: (contact: string) => void;
  saveGame: () => void;
  loadGame: () => boolean;
  autoAdvance: () => void;
  isAutoAdvancing: boolean;
  stopAutoAdvance: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState<Game | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [autoAdvanceInterval, setAutoAdvanceInterval] = useState<NodeJS.Timeout | null>(null);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const startNewGame = useCallback(() => {
    const newGame = new Game();
    setGame(newGame);
    refresh();
  }, [refresh]);

  const advanceTick = useCallback(() => {
    if (!game || game.gameEnded) return;
    game.advanceTick();
    refresh();
  }, [game, refresh]);

  const buyStock = useCallback((ticker: string, amount: number): boolean => {
    if (!game) return false;
    const result = game.buy(ticker, amount);
    refresh();
    return result;
  }, [game, refresh]);

  const sellStock = useCallback((ticker: string, amount: number): boolean => {
    if (!game) return false;
    const result = game.sell(ticker, amount);
    refresh();
    return result;
  }, [game, refresh]);

  const answerCall = useCallback((responseChoice?: string) => {
    if (!game) return;
    game.phone.answerCall(responseChoice);
    refresh();
  }, [game, refresh]);

  const ignoreCall = useCallback(() => {
    if (!game) return;
    game.phone.ignoreCall();
    refresh();
  }, [game, refresh]);

  const makeCall = useCallback((contact: string) => {
    if (!game) return;
    game.phone.makeCall(contact);
    refresh();
  }, [game, refresh]);

  const saveGame = useCallback(() => {
    if (!game) return;
    game.saveGame();
    refresh();
  }, [game, refresh]);

  const loadGame = useCallback((): boolean => {
    const newGame = new Game();
    const success = newGame.loadGame();
    if (success) {
      setGame(newGame);
      refresh();
    }
    return success;
  }, [refresh]);

  const stopAutoAdvance = useCallback(() => {
    if (autoAdvanceInterval) {
      clearInterval(autoAdvanceInterval);
      setAutoAdvanceInterval(null);
    }
    setIsAutoAdvancing(false);
  }, [autoAdvanceInterval]);

  const autoAdvance = useCallback(() => {
    if (!game || game.gameEnded || isAutoAdvancing) return;

    setIsAutoAdvancing(true);
    console.log("Auto-advancing ticks...");

    const interval = setInterval(() => {
      if (!game || game.gameEnded) {
        clearInterval(interval);
        setIsAutoAdvancing(false);
        return;
      }

      if (game.phone.pendingCalls.length > 0 || game.splitsHappened) {
        clearInterval(interval);
        setIsAutoAdvancing(false);
        console.log("Auto-advance stopped due to pending call or split.");
        return;
      }

      game.advanceTick();
      refresh();

      if (game.portfolio.cash <= 0) {
        clearInterval(interval);
        setIsAutoAdvancing(false);
        console.log("💸 Bankrupt! Game over.");
        game.finalizeGame();
        return;
      }
    }, 100);

    setAutoAdvanceInterval(interval);
  }, [game, refresh, isAutoAdvancing]);

  useEffect(() => {
    return () => {
      if (autoAdvanceInterval) {
        clearInterval(autoAdvanceInterval);
      }
    };
  }, [autoAdvanceInterval]);

  const value: GameContextType = {
    game,
    refreshTrigger,
    startNewGame,
    advanceTick,
    buyStock,
    sellStock,
    answerCall,
    ignoreCall,
    makeCall,
    saveGame,
    loadGame,
    autoAdvance,
    isAutoAdvancing,
    stopAutoAdvance
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
