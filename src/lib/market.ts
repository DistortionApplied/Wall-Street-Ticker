import { Market, Stock, StockData, CONFIG, Portfolio, PhoneSystem, NewsEvent } from './types';

// Utility functions
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class MarketImpl implements Market {
  stocks: Record<string, Stock>;

  constructor() {
    const stockData: Record<string, StockData> = {
      AAPL: { name: "Apple", price: 150.0, sector: "Tech", dividend: 0.5 },
      MSFT: { name: "Microsoft", price: 320.0, sector: "Tech", dividend: 0.8 },
      GOOGL: { name: "Alphabet", price: 140.0, sector: "Tech", dividend: 0.3 },
      AMZN: { name: "Amazon", price: 130.0, sector: "Retail", dividend: 0.2 },
      TSLA: { name: "Tesla", price: 200.0, sector: "Auto", dividend: 0.1 },
      META: { name: "Meta", price: 250.0, sector: "Tech", dividend: 0.4 },
      NVDA: { name: "Nvidia", price: 450.0, sector: "Tech", dividend: 0.6 },
      JPM: { name: "JPMorgan Chase", price: 140.0, sector: "Finance", dividend: 1.0 },
      BAC: { name: "Bank of America", price: 35.0, sector: "Finance", dividend: 0.7 },
      WMT: { name: "Walmart", price: 160.0, sector: "Retail", dividend: 0.9 },
      TGT: { name: "Target", price: 130.0, sector: "Retail", dividend: 0.5 },
      KO: { name: "Coca-Cola", price: 60.0, sector: "Consumer", dividend: 0.8 },
      PEP: { name: "PepsiCo", price: 180.0, sector: "Consumer", dividend: 1.2 },
      XOM: { name: "ExxonMobil", price: 110.0, sector: "Energy", dividend: 1.5 },
      CVX: { name: "Chevron", price: 155.0, sector: "Energy", dividend: 1.3 },
      DIS: { name: "Disney", price: 90.0, sector: "Streaming", dividend: 0.6 },
      NFLX: { name: "Netflix", price: 400.0, sector: "Streaming", dividend: 0.8 },
      INTC: { name: "Intel", price: 35.0, sector: "Tech", dividend: 0.4 },
      AMD: { name: "AMD", price: 120.0, sector: "Tech", dividend: 0.3 },
      BA: { name: "Boeing", price: 210.0, sector: "Industrial", dividend: 0.8 },
      GE: { name: "General Electric", price: 140.0, sector: "Industrial", dividend: 0.6 },
      F: { name: "Ford", price: 12.0, sector: "Auto", dividend: 0.5 },
      GM: { name: "General Motors", price: 38.0, sector: "Auto", dividend: 0.7 },
      UBER: { name: "Uber", price: 70.0, sector: "Tech", dividend: 0.0 }
    };

    this.stocks = {};
    for (const [ticker, data] of Object.entries(stockData)) {
      this.stocks[ticker] = {
        ...data,
        momentum: 0.0,
        history: [data.price],
        volatility: randomUniform(0.8, 1.3),
        splitHistory: []
      };
    }
  }

  processDividends(portfolio: Portfolio): number {
    let totalDividend = 0.0;
    for (const [ticker, amt] of Object.entries(portfolio.holdings)) {
      if (amt > 0 && Math.random() < CONFIG.dividend_chance) {
        const dividend = this.stocks[ticker].dividend * amt;
        portfolio.cash += dividend;
        totalDividend += dividend;
        console.log(`💰 Dividend from ${ticker}: $${dividend.toFixed(2)}`);
      }
    }
    return totalDividend;
  }

  processSplits(portfolio: Portfolio): boolean {
    let splitsHappened = false;
    for (const [ticker, stock] of Object.entries(this.stocks)) {
      if (stock.price > 500 && Math.random() < CONFIG.split_chance) {
        stock.price /= 2;
        stock.dividend /= 2;
        portfolio.holdings[ticker] *= 2;
        stock.splitHistory.push(`Day ${1}`);
        splitsHappened = true;
        console.log(`📈 ${ticker} splits 2-for-1! Price and dividend halved. Shares doubled.`);
      }
    }
    return splitsHappened;
  }

  tick(effects: NewsEvent[], tickNumber: number, portfolioHoldings: Record<string, number>, phoneSystem: PhoneSystem): [string, string, number][] {
    const appliedNews: [string, string, number][] = [];

    if (phoneSystem.pendingTip) {
      const tip = phoneSystem.pendingTip;
      if (tip.ticker in this.stocks) {
        this.stocks[tip.ticker].price *= tip.effect;
        this.stocks[tip.ticker].price = Math.round(this.stocks[tip.ticker].price * 100) / 100;
        console.log(`💡 Broker tip effect applied: ${tip.ticker} price adjusted.`);
      }
      phoneSystem.pendingTip = null;
    }

    if (Math.random() < CONFIG.sector_rotation_chance) {
      const sectors = [...new Set(Object.values(this.stocks).map(s => s.sector))];
      const sector = randomChoice(sectors);
      console.log(`\n🔄 Tick ${tickNumber}: Sector rotation: ${sector} gaining momentum!`);
      for (const stock of Object.values(this.stocks)) {
        if (stock.sector === sector) {
          stock.momentum += 0.02;
        }
      }
    }

    for (const [ticker, stock] of Object.entries(this.stocks)) {
      const basePrice = stock.price;
      const trend = randomUniform(-0.01, 0.01);
      const noise = randomUniform(-0.02 * stock.volatility, 0.02 * stock.volatility);
      let change = trend + noise + stock.momentum * 0.3;

      if (tickNumber >= 4) {
        change *= 1.3;
      }

      let totalEffect = 1.0;
      for (const e of effects) {
        if (e.targets.includes(ticker)) {
          const decayFactor = 1 + ((e.effect - 1) * (e.duration! / 4));
          let effect = decayFactor;
          if (Math.random() < CONFIG.misinterpret_chance) {
            effect = 1 / effect;
          }
          totalEffect *= effect;
          appliedNews.push([ticker, e.text, effect]);
        }
      }

      let price = basePrice * (1 + change) * totalEffect;

      const hist = stock.history.slice(-5);
      if (hist.length >= 5 && hist[hist.length - 1] > hist[0] * 1.25 && Math.random() < CONFIG.crash_chance) {
        price *= randomUniform(0.6, 0.85);
        console.log(`⚠️ ${ticker} corrected sharply!`);
      }
      if (hist.length >= 3 && hist[hist.length - 1] < hist[hist.length - 3] * 0.85 && Math.random() < CONFIG.bounce_chance) {
        price *= randomUniform(1.1, 1.25);
        console.log(`💥 ${ticker} bounced sharply!`);
      }

      if (Math.random() < CONFIG.breakout_chance) {
        price *= randomUniform(1.1, 1.3);
        console.log(`🚀 ${ticker} is breaking out!`);
      }

      stock.momentum = (stock.momentum * 0.7) + (change * 0.3);
      stock.price = Math.max(1.0, Math.round(price * 100) / 100);
      stock.history.push(stock.price);
      if (stock.history.length > 50) {
        stock.history.shift();
      }
    }

    return appliedNews;
  }
}
