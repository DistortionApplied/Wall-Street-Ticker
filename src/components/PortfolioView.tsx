'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';

export default function PortfolioView() {
  const { game } = useGame();

  if (!game) return null;

  const holdings = Object.entries(game.portfolio.holdings).filter(([, amt]) => amt > 0);
  const netWorth = game.portfolio.netWorth(game.market);
  const totalValue = holdings.reduce((sum, [ticker, amt]) => 
    sum + game.market.stocks[ticker].price * amt, 0
  );
  const totalPnL = holdings.reduce((sum, [ticker, amt]) => {
    const value = game.market.stocks[ticker].price * amt;
    const cost = game.portfolio.costBasis[ticker];
    return sum + (value - cost);
  }, 0);

  const cashPct = netWorth > 0 ? (game.portfolio.cash / netWorth) * 100 : 0;
  const holdingsPct = netWorth > 0 ? (totalValue / netWorth) * 100 : 0;

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-3">Portfolio</h2>

      <div className="mb-4 p-3 bg-gray-700 rounded">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Cash</div>
            <div className="text-lg font-bold text-green-400">${game.portfolio.cash.toFixed(2)}</div>
            <div className="text-xs text-gray-400">{cashPct.toFixed(1)}% of net worth</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Holdings Value</div>
            <div className="text-lg font-bold text-blue-400">${totalValue.toFixed(2)}</div>
            <div className="text-xs text-gray-400">{holdingsPct.toFixed(1)}% of net worth</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Net Worth</div>
            <div className="text-lg font-bold text-yellow-400">${netWorth.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Total P/L</div>
            <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No holdings. Buy some stocks to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-right py-2 px-2">Shares</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-right py-2 px-2">Value</th>
                <th className="text-right py-2 px-2">Cost</th>
                <th className="text-right py-2 px-2">P/L</th>
                <th className="text-right py-2 px-2">P/L %</th>
                <th className="text-right py-2 px-2">% Port</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(([ticker, amt]) => {
                const stock = game.market.stocks[ticker];
                const value = stock.price * amt;
                const cost = game.portfolio.costBasis[ticker];
                const pnl = value - cost;
                const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                const portPct = netWorth > 0 ? (value / netWorth) * 100 : 0;

                return (
                  <tr key={ticker} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-2 px-2 font-mono font-bold">{ticker}</td>
                    <td className="py-2 px-2 text-right">{amt}</td>
                    <td className="py-2 px-2 text-right font-mono">${stock.price.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono">${value.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-gray-400">${cost.toFixed(2)}</td>
                    <td className={`py-2 px-2 text-right font-mono ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono ${pnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right text-gray-400">
                      {portPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
