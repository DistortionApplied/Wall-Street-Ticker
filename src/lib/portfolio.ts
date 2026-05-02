import { Portfolio, Market, STARTING_CASH } from './types';

export class PortfolioImpl implements Portfolio {
  cash: number;
  holdings: Record<string, number>;
  costBasis: Record<string, number>;

  constructor(market: Market) {
    this.cash = STARTING_CASH;
    this.holdings = {};
    this.costBasis = {};

    for (const ticker of Object.keys(market.stocks)) {
      this.holdings[ticker] = 0;
      this.costBasis[ticker] = 0.0;
    }
  }

  netWorth(market: Market): number {
    return this.cash + Object.entries(this.holdings).reduce(
      (total, [ticker, amt]) => total + market.stocks[ticker].price * amt,
      0
    );
  }

  buy(ticker: string, amount: number, market: Market): boolean {
    if (!(ticker in market.stocks)) {
      console.log("Invalid ticker.");
      return false;
    }
    const cost = market.stocks[ticker].price * amount;
    if (cost > this.cash) {
      console.log("Not enough cash.");
      return false;
    }
    this.cash -= cost;
    this.holdings[ticker] += amount;
    this.costBasis[ticker] += cost;
    console.log(`Bought ${amount} shares of ${ticker} for $${cost.toFixed(2)}.`);
    return true;
  }

  sell(ticker: string, amount: number, market: Market): boolean {
    if (!(ticker in market.stocks)) {
      console.log("Invalid ticker.");
      return false;
    }
    if (amount > this.holdings[ticker]) {
      console.log("Not enough shares.");
      return false;
    }
    const proceeds = market.stocks[ticker].price * amount;
    this.cash += proceeds;
    this.holdings[ticker] -= amount;
    console.log(`Sold ${amount} shares of ${ticker} for $${proceeds.toFixed(2)}.`);
    return true;
  }
}
