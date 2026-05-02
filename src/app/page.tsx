'use client';

import { GameProvider } from '@/contexts/GameContext';
import GameUI from '@/components/GameUI';

export default function Home() {
  return (
    <GameProvider>
      <GameUI />
    </GameProvider>
  );
}
