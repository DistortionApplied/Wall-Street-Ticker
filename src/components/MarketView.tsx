'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';

export default function MarketView() {
  const { game } = useGame();

  if (!game) return null;

  const sortedStocks = Object.entries(game.market.stocks).sort((a, b) => {
    const aChange = a[1].price - (a[1].history.length > 1 ? a[1].history[a[1].history.length - 2] : a[1].price);
    const bChange = b[1].price - (b[1].history.length > 1 ? b[1].history[b[1].history.length - 2] : b[1].price);
    return bChange - aChange;
  });

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto">
      <h2 className="text-xl font-bold mb-3">Market Overview</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-2">Ticker</th>
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Change</th>
              <th className="text-left py-2 px-2">Sector</th>
              <th className="text-right py-2 px-2">Dividend</th>
              <th className="text-right py-2 px-2">Owned</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map(([ticker, stock]) => {
              const prevPrice = stock.history.length > 1 ? stock.history[stock.history.length - 2] : stock.price;
              const change = stock.price - prevPrice;
              const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;
              const owned = game.portfolio.holdings[ticker] || 0;
              const isPositive = change > 0;
              const isNegative = change < 0;

              return (
                <tr key={ticker} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="py-2 px-2 font-mono font-bold">{ticker}</td>
                  <td className="py-2 px-2">{stock.name}</td>
                  <td className="py-2 px-2 text-right font-mono">${stock.price.toFixed(2)}</td>
                  <td className={`py-2 px-2 text-right font-mono ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'}`}>
                    {isPositive ? '▲' : isNegative ? '▼' : '→'} {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                  </td>
                  <td className="py-2 px-2">{stock.sector}</td>
                  <td className="py-2 px-2 text-right">${stock.dividend.toFixed(2)}</td>
                  <td className={`py-2 px-2 text-right font-bold ${owned > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {owned}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <h3 className="text-lg font-bold mb-2">Top Movers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {sortedStocks.slice(0, 3).map(([ticker, stock]) => {
            const prevPrice = stock.history.length > 1 ? stock.history[stock.history.length - 2] : stock.price;
            const change = stock.price - prevPrice;
            const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;

            return (
              <div key={ticker} className={`p-2 rounded ${change > 0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="font-bold">{ticker}</div>
                <div className={`text-sm ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
