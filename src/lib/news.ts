import { Market, NewsEvent, NewsSystem, NewsEntry, SequentialEvent, CONFIG } from './types';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class NewsSystemImpl implements NewsSystem {
  market: Market;
  newsHistory: Record<string, NewsEntry[]> = {};
  current: NewsEvent[] = [];
  activeEffects: NewsEvent[] = [];
  sequentialEvents: SequentialEvent[] = [];
  pool: NewsEvent[];

  constructor(market: Market) {
    this.market = market;
    const allTickers = Object.keys(market.stocks);

    this.pool = [
      { text: "Tech booming.", targets: ["AAPL", "MSFT", "NVDA", "AMD", "META", "UBER"], effect: 1.08, category: "positive", type: "sector" },
      { text: "Tech selloff.", targets: ["AAPL", "MSFT", "NVDA", "AMD", "META", "UBER"], effect: 0.92, category: "negative", type: "sector" },
      { text: "New AI breakthrough announced.", targets: ["NVDA", "AMD", "MSFT", "GOOGL"], effect: 1.10, category: "positive", type: "innovation" },
      { text: "Data privacy concerns rise.", targets: ["META", "GOOGL", "AAPL"], effect: 0.95, category: "negative", type: "regulatory" },
      { text: "Apple announces new iPhone.", targets: ["AAPL"], effect: 1.12, category: "positive", type: "product" },
      { text: "Microsoft acquires AI startup.", targets: ["MSFT"], effect: 1.08, category: "positive", type: "merger" },
      { text: "Google faces antitrust fine.", targets: ["GOOGL"], effect: 0.90, category: "negative", type: "legal" },
      { text: "Meta launches new VR headset.", targets: ["META"], effect: 1.06, category: "positive", type: "product" },
      { text: "Nvidia GPU shortages continue.", targets: ["NVDA"], effect: 0.94, category: "negative", type: "supply" },
      { text: "AMD launches competitive chip.", targets: ["AMD"], effect: 1.07, category: "positive", type: "product" },
      { text: "Uber reports strong ride-sharing growth.", targets: ["UBER"], effect: 1.09, category: "positive", type: "earnings" },
      { text: "Auto sales surge.", targets: ["F", "GM", "TSLA"], effect: 1.08, category: "positive", type: "demand" },
      { text: "Auto slowdown.", targets: ["F", "GM", "TSLA"], effect: 0.92, category: "negative", type: "economic" },
      { text: "Tesla unveils new EV model.", targets: ["TSLA"], effect: 1.15, category: "positive", type: "innovation" },
      { text: "Oil spike.", targets: ["XOM", "CVX"], effect: 1.08, category: "positive", type: "commodity" },
      { text: "Oil glut.", targets: ["XOM", "CVX"], effect: 0.92, category: "negative", type: "commodity" },
      { text: "Banks strong.", targets: ["JPM", "BAC"], effect: 1.08, category: "positive", type: "earnings" },
      { text: "Banks weak.", targets: ["JPM", "BAC"], effect: 0.92, category: "negative", type: "economic" },
      { text: "Retail strong.", targets: ["WMT", "TGT", "AMZN"], effect: 1.08, category: "positive", type: "demand" },
      { text: "Retail weak.", targets: ["WMT", "TGT", "AMZN"], effect: 0.92, category: "negative", type: "competition" },
      { text: "Streaming Strong.", targets: ["DIS", "NFLX"], effect: 1.08, category: "positive", type: "demand" },
      { text: "Streaming Weak.", targets: ["DIS", "NFLX"], effect: 0.92, category: "negative", type: "competition" },
      { text: "Global economy strengthens.", targets: allTickers, effect: 1.03, category: "positive", type: "economic" },
      { text: "Recession fears grow.", targets: allTickers, effect: 0.97, category: "negative", type: "economic" },
    ];
  }

  getRandomEvent(userHoldings?: string[]): NewsEvent {
    let base = randomChoice(this.pool);

    if (userHoldings && userHoldings.length > 0 && Math.random() < CONFIG.user_focus_news_chance) {
      const ownedNews = this.pool.filter(n => n.targets.some(t => userHoldings.includes(t)));
      if (ownedNews.length > 0) {
        base = randomChoice(ownedNews);
      }
    }

    if (this.activeEffects.length > 0 && Math.random() < 0.3) {
      const e = randomChoice(this.activeEffects);
      return {
        text: `${e.text} reversing.`,
        targets: e.targets,
        effect: 1 / e.effect,
        category: "neutral",
        type: "reversal"
      };
    }

    return base;
  }

  addEvent(event: NewsEvent): void {
    const newSectors = new Set<string>();
    for (const t of event.targets) {
      if (t in this.market.stocks) {
        newSectors.add(this.market.stocks[t].sector);
      }
    }

    this.activeEffects = this.activeEffects.filter(e => {
      const eSectors = new Set<string>();
      for (const t of e.targets) {
        if (t in this.market.stocks) {
          eSectors.add(this.market.stocks[t].sector);
        }
      }
      const intersection = [...newSectors].filter(s => eSectors.has(s));
      return intersection.length === 0;
    });

    const newEvent = { ...event, duration: randomInt(2, 4) };
    this.activeEffects.push(newEvent);
    this.current.push(event);

    if ((event.text.toLowerCase().includes("announces") || event.text.toLowerCase().includes("launches")) && !event.isFollowUp) {
      this.sequentialEvents.push({
        trigger: event.text,
        followUp: this.generateFollowUp(),
        delay: randomInt(1, 3),
        targets: event.targets
      });
    }
  }

  generateFollowUp(): string {
    const followUps = [
      "Market reacts positively to recent announcement.",
      "Analysts adjust forecasts following news.",
      "Competitors respond to new developments.",
      "Investor sentiment shifts after update."
    ];
    return randomChoice(followUps);
  }

  processSequentialEvents(): void {
    for (const seq of [...this.sequentialEvents]) {
      seq.delay -= 1;
      if (seq.delay <= 0) {
        const followUp: NewsEvent = {
          text: `${seq.followUp} (${seq.trigger})`,
          targets: seq.targets,
          effect: randomUniform(0.98, 1.05),
          category: "neutral",
          type: "followup",
          isFollowUp: true
        };
        this.addEvent(followUp);
        this.sequentialEvents = this.sequentialEvents.filter(s => s !== seq);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateInsiderTip(portfolio: any): void {
    if (Math.random() < CONFIG.insider_tip_chance) {
      const owned = Object.entries(portfolio.holdings)
        .filter(([, amt]) => (amt as number) > 0)
        .map(([ticker]) => ticker);
      
      if (owned.length > 0) {
        const tipStock = randomChoice(owned);
        const tipType = randomChoice(["positive", "negative"]);
        const effect = tipType === "positive" ? 1.05 : 0.95;
        console.log(`🕵️ Insider tip: ${this.market.stocks[tipStock].name} may ${tipType === "positive" ? "rise" : "fall"} soon.`);
        this.market.stocks[tipStock].price *= effect;
        this.market.stocks[tipStock].price = Math.round(this.market.stocks[tipStock].price * 100) / 100;
      }
    }
  }

  generate(userHoldings: string[] = []): void {
    this.current = [];
    const usedSectors = new Set<string>();
    const shuffled = [...this.pool];
    
    // Shuffle array
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (const n of shuffled) {
      const sectors = new Set<string>();
      for (const t of n.targets) {
        if (t in this.market.stocks) {
          sectors.add(this.market.stocks[t].sector);
        }
      }

      const intersection = [...sectors].filter(s => usedSectors.has(s));
      if (intersection.length === 0) {
        if (userHoldings.length > 0 && n.targets.some(t => userHoldings.includes(t))) {
          if (Math.random() < 0.2) {
            this.current.push(n);
            sectors.forEach(s => usedSectors.add(s));
            continue;
          }
        }
        this.current.push(n);
        sectors.forEach(s => usedSectors.add(s));
      }

      if (this.current.length === 3) {
        break;
      }
    }

    this.activeEffects = this.current.map(n => ({ ...n, duration: randomInt(2, 4) }));
  }

  decay(): void {
    for (const e of this.activeEffects) {
      if (e.duration) {
        e.duration -= 1;
      }
    }
    this.activeEffects = this.activeEffects.filter(e => (e.duration || 0) > 0);
  }
}
