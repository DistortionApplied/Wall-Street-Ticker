'use client';

import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';

export default function ActionButtons() {
  const { game, advanceTick, buyStock, sellStock, saveGame, loadGame, autoAdvance, isAutoAdvancing, stopAutoAdvance } = useGame();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [amount, setAmount] = useState('');

  if (!game) return null;

  const handleBuy = () => {
    if (!selectedTicker || !amount) {
      alert('Please select a ticker and enter amount');
      return;
    }
    const success = buyStock(selectedTicker, parseInt(amount));
    if (success) {
      setShowBuyModal(false);
      setSelectedTicker('');
      setAmount('');
    }
  };

  const handleSell = () => {
    if (!selectedTicker || !amount) {
      alert('Please select a ticker and enter amount');
      return;
    }
    const success = sellStock(selectedTicker, parseInt(amount));
    if (success) {
      setShowSellModal(false);
      setSelectedTicker('');
      setAmount('');
    }
  };

  const holdings = Object.entries(game.portfolio.holdings).filter(([, amt]) => amt > 0);

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-3">Actions</h2>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowBuyModal(true)}
          disabled={game.gameEnded}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition"
        >
          📈 Buy Stock
        </button>

        <button
          onClick={() => setShowSellModal(true)}
          disabled={game.gameEnded || holdings.length === 0}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition"
        >
          📉 Sell Stock
        </button>

        <button
          onClick={advanceTick}
          disabled={game.gameEnded || isAutoAdvancing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition"
        >
          ⏭️ Next Tick
        </button>

        <button
          onClick={isAutoAdvancing ? stopAutoAdvance : autoAdvance}
          disabled={game.gameEnded}
          className={`${isAutoAdvancing ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'} disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition`}
        >
          {isAutoAdvancing ? '⏸️ Stop Auto' : '⏩ Auto Advance'}
        </button>

        <button
          onClick={saveGame}
          disabled={game.gameEnded}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition"
        >
          💾 Save Game
        </button>

        <button
          onClick={loadGame}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded transition"
        >
          📂 Load Game
        </button>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Buy Stock</h3>
            
            <div className="mb-4">
              <label className="block text-sm mb-2">Select Stock:</label>
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              >
                <option value="">-- Select Ticker --</option>
                {Object.entries(game.market.stocks).map(([ticker, stock]) => (
                  <option key={ticker} value={ticker}>
                    {ticker} - {stock.name} (${stock.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {selectedTicker && (
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <div className="text-sm">
                  <div>Price: ${game.market.stocks[selectedTicker].price.toFixed(2)}</div>
                  <div>Available Cash: ${game.portfolio.cash.toFixed(2)}</div>
                  <div>Max Shares: {Math.floor(game.portfolio.cash / game.market.stocks[selectedTicker].price)}</div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm mb-2">Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="w-full p-2 bg-gray-700 rounded"
                placeholder="Number of shares"
              />
            </div>

            {selectedTicker && amount && (
              <div className="mb-4 p-2 bg-blue-900/30 rounded text-sm">
                Total Cost: ${(game.market.stocks[selectedTicker].price * parseInt(amount || '0')).toFixed(2)}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleBuy}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Confirm Buy
              </button>
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setSelectedTicker('');
                  setAmount('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Sell Stock</h3>
            
            <div className="mb-4">
              <label className="block text-sm mb-2">Select Stock:</label>
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded"
              >
                <option value="">-- Select Ticker --</option>
                {holdings.map(([ticker, amt]) => (
                  <option key={ticker} value={ticker}>
                    {ticker} - {game.market.stocks[ticker].name} ({amt} shares @ ${game.market.stocks[ticker].price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {selectedTicker && game.portfolio.holdings[selectedTicker] > 0 && (
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <div className="text-sm">
                  <div>Current Price: ${game.market.stocks[selectedTicker].price.toFixed(2)}</div>
                  <div>Owned Shares: {game.portfolio.holdings[selectedTicker]}</div>
                  <div>Cost Basis: ${game.portfolio.costBasis[selectedTicker].toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm mb-2">Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={selectedTicker ? game.portfolio.holdings[selectedTicker] : 0}
                className="w-full p-2 bg-gray-700 rounded"
                placeholder="Number of shares"
              />
            </div>

            {selectedTicker && amount && (
              <div className="mb-4 p-2 bg-red-900/30 rounded text-sm">
                Total Proceeds: ${(game.market.stocks[selectedTicker].price * parseInt(amount || '0')).toFixed(2)}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSell}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Confirm Sell
              </button>
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSelectedTicker('');
                  setAmount('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
