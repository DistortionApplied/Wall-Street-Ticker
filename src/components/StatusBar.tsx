'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';

export default function StatusBar() {
  const { game } = useGame();

  if (!game) return null;

  const status = game.phone.getStatus();
  const netWorth = game.portfolio.netWorth(game.market);

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <div>
          <span className="text-gray-400 text-sm">Day:</span>
          <span className="ml-2 font-bold text-xl">{game.day}</span>
          <span className="text-gray-400 ml-2">/ {game.maxDays}</span>
        </div>
        <div>
          <span className="text-gray-400 text-sm">Tick:</span>
          <span className="ml-2 font-bold text-xl">{game.tickNumber}</span>
          <span className="text-gray-400 ml-2">/ 6</span>
        </div>
        <div>
          <span className="text-gray-400 text-sm">Cash:</span>
          <span className="ml-2 font-bold text-green-400">${game.portfolio.cash.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-400 text-sm">Net Worth:</span>
          <span className="ml-2 font-bold text-blue-400">${netWorth.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Happiness</span>
            <span className="text-sm font-bold">{status.happiness}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                status.happiness > 80 ? 'bg-green-500' :
                status.happiness > 50 ? 'bg-yellow-500' :
                status.happiness > 20 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${status.happiness}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Health</span>
            <span className="text-sm font-bold">{status.health}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                status.health > 80 ? 'bg-green-500' :
                status.health > 50 ? 'bg-yellow-500' :
                status.health > 20 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${status.health}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Business</span>
            <span className="text-sm font-bold">{status.business}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                status.business > 80 ? 'bg-green-500' :
                status.business > 50 ? 'bg-yellow-500' :
                status.business > 20 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${status.business}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-sm mr-2">Pending Calls:</span>
          <span className={`text-lg font-bold ${status.pendingCalls > 0 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
            {status.pendingCalls > 0 && '📞 '}
            {status.pendingCalls}
          </span>
        </div>
      </div>

      {game.phone.loan && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-500 rounded">
          <span className="text-red-300 text-sm">
            💰 Loan: ${game.phone.loan.totalDue.toFixed(2)} due on Day {game.phone.loan.dueDay}
          </span>
        </div>
      )}
    </div>
  );
}
