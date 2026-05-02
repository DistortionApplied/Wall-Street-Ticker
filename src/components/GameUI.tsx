'use client';

import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import StatusBar from './StatusBar';
import MarketView from './MarketView';
import PortfolioView from './PortfolioView';
import NewsView from './NewsView';
import PhoneInterface from './PhoneInterface';
import ActionButtons from './ActionButtons';

export default function GameUI() {
  const { game, startNewGame } = useGame();
  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'news' | 'phone'>('market');

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">📈 Wall Street Ticker 📉</h1>
            <p className="text-xl text-gray-300 mb-2">Master the Stock Market!</p>
            <p className="text-gray-400">Balance trading with your personal life</p>
          </div>

          <div className="space-y-4 mb-8 text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📞</span>
              <div>
                <div className="font-semibold">Answer Calls from Wife, Health & Business</div>
                <div className="text-sm text-gray-400">Manage your relationships and health while trading</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <div className="font-semibold">Trade 24 Different Stocks</div>
                <div className="text-sm text-gray-400">Tech, Finance, Energy, Retail and more!</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📰</span>
              <div>
                <div className="font-semibold">Dynamic News & Events</div>
                <div className="text-sm text-gray-400">React to market-moving news in real-time</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-semibold">30 Days to Build Your Fortune</div>
                <div className="text-sm text-gray-400">Start with $5,000, finish as a legend!</div>
              </div>
            </div>
          </div>

          <button
            onClick={startNewGame}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition transform hover:scale-105 shadow-lg"
          >
            🚀 Start New Game
          </button>
        </div>
      </div>
    );
  }

  if (game.gameEnded) {
    const finalWorth = game.portfolio.netWorth(game.market);
    const needsHighScore = game.checkHighScore(finalWorth);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-white mb-6 text-center">🏁 Game Over!</h1>
          
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">
              {finalWorth >= 25000 ? '🏆' : finalWorth >= 20000 ? '⭐' : finalWorth >= 15000 ? '👍' : '📊'}
            </div>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              Final Net Worth: ${finalWorth.toFixed(2)}
            </div>
            <div className="text-xl text-gray-300">
              {finalWorth >= 25000 ? 'Wall Street Legend!' :
               finalWorth >= 20000 ? 'Wall Street Pro!' :
               finalWorth >= 15000 ? 'Solid Trader!' :
               finalWorth >= 10000 ? 'Decent Start!' :
               'Tough Market!'}
            </div>
          </div>

          <div className="bg-gray-700 p-4 rounded mb-6">
            <h3 className="font-bold mb-2">Final Stats:</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Happiness: {game.phone.happiness}%</div>
              <div>Health: {game.phone.health}%</div>
              <div>Business: {game.phone.business}%</div>
              <div>Days Played: {game.day - 1}</div>
            </div>
          </div>

          {needsHighScore && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">🎉 New High Score!</h3>
              <input
                type="text"
                placeholder="Enter your name (12 chars max)"
                maxLength={12}
                className="w-full p-2 bg-gray-700 text-white rounded mb-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const name = (e.target as HTMLInputElement).value;
                    game.addHighScore(name, finalWorth);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                  game.addHighScore(input.value, finalWorth);
                  input.value = '';
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
              >
                Save High Score
              </button>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-bold mb-3">🏆 High Scores</h3>
            <div className="bg-gray-700 p-4 rounded">
              {game.highScores.map((score, idx) => (
                <div key={idx} className="flex justify-between py-1">
                  <span>{idx + 1}. {score.name}</span>
                  <span className="font-mono">${score.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startNewGame}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition"
          >
            🔄 Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white mb-2">📈 Wall Street Ticker 📉</h1>
        </div>

        <StatusBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab('market')}
                  className={`flex-1 py-2 px-4 rounded transition ${
                    activeTab === 'market'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📊 Market
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 py-2 px-4 rounded transition ${
                    activeTab === 'portfolio'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  💼 Portfolio
                </button>
                <button
                  onClick={() => setActiveTab('news')}
                  className={`flex-1 py-2 px-4 rounded transition ${
                    activeTab === 'news'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📰 News
                </button>
                <button
                  onClick={() => setActiveTab('phone')}
                  className={`flex-1 py-2 px-4 rounded transition ${
                    activeTab === 'phone'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📞 Phone {game.phone.pendingCalls.length > 0 && '(!)'}
                </button>
              </div>

              {activeTab === 'market' && <MarketView />}
              {activeTab === 'portfolio' && <PortfolioView />}
              {activeTab === 'news' && <NewsView />}
              {activeTab === 'phone' && <PhoneInterface />}
            </div>
          </div>

          <div>
            <ActionButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
