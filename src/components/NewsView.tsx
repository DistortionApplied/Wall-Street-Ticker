'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';

export default function NewsView() {
  const { game } = useGame();

  if (!game) return null;

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'positive': return '🟢';
      case 'negative': return '🔴';
      default: return '🟡';
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-3">📰 News & Events</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Active News (Affecting Prices)</h3>
        {game.news.activeEffects.length === 0 ? (
          <div className="text-gray-400 text-sm">No active news effects.</div>
        ) : (
          <div className="space-y-2">
            {game.news.activeEffects.map((effect, idx) => {
              const targetsDisplay = effect.targets.slice(0, 5).join(', ') + 
                (effect.targets.length > 5 ? '...' : '');
              
              return (
                <div key={idx} className="p-3 bg-gray-700 rounded">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{getCategoryEmoji(effect.category)}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{effect.text}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        Affects: {targetsDisplay}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Duration: {effect.duration} ticks | Effect: {(effect.effect * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Today&apos;s Headlines</h3>
        {game.news.current.length === 0 ? (
          <div className="text-gray-400 text-sm">No major news today.</div>
        ) : (
          <div className="space-y-2">
            {game.news.current.map((newsItem, idx) => (
              <div key={idx} className="p-2 bg-gray-700 rounded flex items-center gap-2">
                <span className="text-xl">{getCategoryEmoji(newsItem.category)}</span>
                <span>{newsItem.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {game.news.sequentialEvents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
          <div className="space-y-2">
            {game.news.sequentialEvents.map((seq, idx) => (
              <div key={idx} className="p-2 bg-gray-700 rounded text-sm">
                <div className="text-gray-400">In {seq.delay} tick{seq.delay !== 1 ? 's' : ''}:</div>
                <div>{seq.followUp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
