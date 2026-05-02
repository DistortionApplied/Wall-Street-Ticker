import { GameState, HighScore, MAX_DAYS, TICKS_PER_DAY, CONFIG } from './types';
import { MarketImpl } from './market';
import { PortfolioImpl } from './portfolio';
import { NewsSystemImpl } from './news';
import { PhoneSystemImpl } from './phone';

export class Game implements GameState {
  day: number = 1;
  maxDays: number = MAX_DAYS;
  tickNumber: number = 0;
  gameEnded: boolean = false;
  resuming: boolean = false;
  market: MarketImpl;
  portfolio: PortfolioImpl;
  news: NewsSystemImpl;
  phone: PhoneSystemImpl;
  highScores: HighScore[] = [];
  splitsHappened: boolean = false;

  constructor() {
    this.market = new MarketImpl();
    this.portfolio = new PortfolioImpl(this.market);
    this.news = new NewsSystemImpl(this.market);
    this.phone = new PhoneSystemImpl(this);
    this.highScores = this.loadHighScores();
  }

  loadHighScores(): HighScore[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('wallstreet_highscores');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load high scores:', e);
    }
    return Array(10).fill(null).map(() => ({ name: "AAAAA", score: 100 }));
  }

  saveHighScores(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('wallstreet_highscores', JSON.stringify(this.highScores));
    } catch (e) {
      console.error('Failed to save high scores:', e);
    }
  }

  checkHighScore(finalWorth: number): boolean {
    if (this.highScores.length < 10 || finalWorth > Math.min(...this.highScores.map(s => s.score))) {
      return true;
    }
    return false;
  }

  addHighScore(name: string, score: number): void {
    this.highScores.push({ name: name.slice(0, 12) || "Anonymous", score });
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 10);
    this.saveHighScores();
  }

  advanceTick(): void {
    if (this.tickNumber >= TICKS_PER_DAY) {
      this.advanceDay();
      return;
    }

    if (!this.resuming) {
      this.tickNumber += 1;
    }
    this.resuming = false;

    if (this.tickNumber === 1) {
      const ownedStocks = Object.entries(this.portfolio.holdings)
        .filter(([, amt]) => amt > 0)
        .map(([ticker]) => ticker);
      this.news.generate(ownedStocks);
    }

    const appliedNews = this.market.tick(
      this.news.activeEffects,
      this.tickNumber,
      this.portfolio.holdings,
      this.phone
    );

    for (const [ticker, text, effect] of appliedNews) {
      const newsItem = this.news.pool.find(n => n.text === text);
      const category = newsItem?.category || "neutral";
      
      if (!this.news.newsHistory[ticker]) {
        this.news.newsHistory[ticker] = [];
      }
      
      this.news.newsHistory[ticker].push({
        day: this.day,
        tick: this.tickNumber,
        text,
        effect,
        category
      });
    }

    this.news.decay();
    this.news.processSequentialEvents();

    this.phone.checkIncomingCall();

    if (Math.random() < CONFIG.intraday_news_chance) {
      const ownedStocks = Object.entries(this.portfolio.holdings)
        .filter(([, amt]) => amt > 0)
        .map(([ticker]) => ticker);
      const event = this.news.getRandomEvent(ownedStocks);
      if (event) {
        console.log(`\nBREAKING: ${event.text}`);
        this.news.addEvent(event);
      }
    }

    if (this.phone.pendingCalls.length > 0) {
      const call = this.phone.pendingCalls[0];
      const pendingTicks = (this.day - call.dayAdded) * TICKS_PER_DAY + (this.tickNumber - call.time);
      if (pendingTicks >= 2) {
        this.phone.ignoreCall();
      }
    }
  }

  advanceDay(): void {
    console.log(`\n--- End of Day ${this.day} ---`);
    this.day += 1;

    if (this.day > this.maxDays) {
      this.finalizeGame();
      return;
    }

    if (!this.resuming) {
      this.phone.dailyReset();
      if (this.gameEnded || this.phone.criticalEvent) {
        return;
      }
      this.news.generateInsiderTip(this.portfolio);
      this.market.processDividends(this.portfolio);
      this.splitsHappened = this.market.processSplits(this.portfolio);
    }

    this.resuming = false;
    this.tickNumber = 0;
    this.phone.checkLoanRepayment();
  }

  buy(ticker: string, amount: number): boolean {
    if (this.phone.business <= 20 && Math.random() < 0.2) {
      console.log("Trade failed due to poor business reputation.");
      return false;
    }
    return this.portfolio.buy(ticker, amount, this.market);
  }

  sell(ticker: string, amount: number): boolean {
    if (this.phone.business <= 20 && Math.random() < 0.2) {
      console.log("Trade failed due to poor business reputation.");
      return false;
    }
    return this.portfolio.sell(ticker, amount, this.market);
  }

  finalizeGame(): void {
    this.gameEnded = true;
    let finalWorth = this.portfolio.netWorth(this.market);
    console.log(`\n🏁 Game Over! Base Net Worth: $${finalWorth.toFixed(2)}`);

    if (!this.phone.divorceInitiated) {
      if (this.phone.happiness > 80) {
        const bonus = 0.1 * finalWorth;
        finalWorth += bonus;
        console.log(`Strong marriage bonus: +$${bonus.toFixed(2)}`);
      } else if (this.phone.happiness > 50) {
        const bonus = 0.05 * finalWorth;
        finalWorth += bonus;
        console.log(`Good marriage bonus: +$${bonus.toFixed(2)}`);
      }
    } else {
      const penalty = 0.2 * finalWorth;
      finalWorth -= penalty;
      console.log(`Divorce penalty: -$${penalty.toFixed(2)}`);
    }

    if (this.phone.health > 80) {
      const bonus = 0.1 * finalWorth;
      finalWorth += bonus;
      console.log(`Excellent health bonus: +$${bonus.toFixed(2)}`);
    } else if (this.phone.health > 50) {
      const bonus = 0.05 * finalWorth;
      finalWorth += bonus;
      console.log(`Good health bonus: +$${bonus.toFixed(2)}`);
    } else {
      const penalty = 0.1 * finalWorth;
      finalWorth -= penalty;
      console.log(`Poor health penalty: -$${penalty.toFixed(2)}`);
    }

    if (this.phone.business > 80) {
      const bonus = 0.1 * finalWorth;
      finalWorth += bonus;
      console.log(`Excellent business bonus: +$${bonus.toFixed(2)}`);
    } else if (this.phone.business > 50) {
      const bonus = 0.05 * finalWorth;
      finalWorth += bonus;
      console.log(`Good business bonus: +$${bonus.toFixed(2)}`);
    } else {
      const penalty = 0.1 * finalWorth;
      finalWorth -= penalty;
      console.log(`Poor business penalty: -$${penalty.toFixed(2)}`);
    }

    console.log(`Final Adjusted Net Worth: $${finalWorth.toFixed(2)}`);

    if (finalWorth >= 25000) {
      console.log("Wall Street Legend! Outstanding performance!");
    } else if (finalWorth >= 20000) {
      console.log("Wall Street Pro! Excellent trading!");
    } else if (finalWorth >= 15000) {
      console.log("Solid Trader! Good job.");
    } else if (finalWorth >= 10000) {
      console.log("Decent Start. Keep learning.");
    } else {
      console.log("Tough market. Better luck next time!");
    }

    if (this.phone.loan) {
      const totalDue = this.phone.loan.totalDue;
      this.portfolio.cash -= totalDue;
      console.log(`Outstanding loan repaid: $${totalDue.toFixed(2)}`);
      this.phone.loan = null;
    }

    return;
  }

  saveGame(): void {
    if (typeof window === 'undefined') return;
    
    const saveData = {
      day: this.day,
      tickNumber: this.tickNumber,
      gameEnded: this.gameEnded,
      cash: this.portfolio.cash,
      holdings: this.portfolio.holdings,
      costBasis: this.portfolio.costBasis,
      stocks: this.market.stocks,
      newsHistory: this.news.newsHistory,
      sequentialEvents: this.news.sequentialEvents,
      activeEffects: this.news.activeEffects,
      currentNews: this.news.current,
      pendingCalls: this.phone.pendingCalls,
      ignoredCalls: this.phone.ignoredCalls,
      happiness: this.phone.happiness,
      health: this.phone.health,
      business: this.phone.business,
      hasInsurance: this.phone.hasInsurance,
      hasLawyer: this.phone.hasLawyer,
      loan: this.phone.loan,
      pendingTip: this.phone.pendingTip,
      callBalance: this.phone.callBalance,
      pendingAppointment: this.phone.pendingAppointment,
      birthdayUsed: this.phone.birthdayUsed,
      divorceInitiated: this.phone.divorceInitiated,
      anniversaryUsed: this.phone.anniversaryUsed,
      endDayEarly: this.phone.endDayEarly
    };

    try {
      localStorage.setItem('wallstreet_savegame', JSON.stringify(saveData));
      console.log('💾 Game saved successfully.');
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  loadGame(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const stored = localStorage.getItem('wallstreet_savegame');
      if (!stored) {
        console.log('No save file found.');
        return false;
      }

      const data = JSON.parse(stored);
      
      this.day = data.day;
      this.tickNumber = data.tickNumber;
      this.gameEnded = data.gameEnded || false;
      if (this.tickNumber > 0) {
        this.resuming = true;
      }
      
      this.portfolio.cash = data.cash;
      this.portfolio.holdings = data.holdings;
      this.portfolio.costBasis = data.costBasis;
      this.market.stocks = data.stocks;
      this.news.newsHistory = data.newsHistory;
      this.news.sequentialEvents = data.sequentialEvents || [];
      this.news.activeEffects = data.activeEffects || [];
      this.news.current = data.currentNews || [];
      this.phone.pendingCalls = data.pendingCalls || [];
      this.phone.ignoredCalls = data.ignoredCalls || { wife: 0, health: 0, business: 0 };
      this.phone.happiness = data.happiness || 100;
      this.phone.health = data.health || 100;
      this.phone.business = data.business || 100;
      this.phone.hasInsurance = data.hasInsurance || false;
      this.phone.hasLawyer = data.hasLawyer || false;
      this.phone.loan = data.loan || null;
      this.phone.pendingTip = data.pendingTip || null;
      this.phone.callBalance = data.callBalance || { wife: 0, health: 0, business: 0 };
      this.phone.pendingAppointment = data.pendingAppointment || false;
      this.phone.anniversaryUsed = data.anniversaryUsed || false;
      this.phone.birthdayUsed = data.birthdayUsed || false;
      this.phone.divorceInitiated = data.divorceInitiated || false;
      this.phone.endDayEarly = data.endDayEarly || false;

      console.log('📂 Game loaded successfully.');
      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  }
}
