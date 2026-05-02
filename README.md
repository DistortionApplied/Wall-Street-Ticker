# Wall Street Ticker - Web Edition

A web-based stock market simulation game that challenges you to balance trading success with personal life management.

## Game Overview

Wall Street Ticker is a strategic simulation where you play as a stock trader trying to maximize your net worth over 30 days. The twist? You must also manage your personal life aspects:

- **Happiness**: Maintain good relationships with your wife
- **Health**: Keep yourself in good physical condition  
- **Business**: Maintain professional reputation

Failing to manage these aspects can lead to critical events like divorce, hospitalization, or SEC investigations that severely impact your finances.

## Features

- **24 Stocks** across 8 sectors (Tech, Finance, Energy, Retail, Consumer, Auto, Industrial, Streaming)
- **Dynamic Market Events**: News and sector rotations affect stock prices
- **Life Management**: Handle phone calls from wife, health reminders, and business contacts
- **Dividends & Splits**: Earn passive income and experience stock splits
- **Financial Services**: Loans, insurance, lawyer, broker tips
- **Save/Load System**: Persist your game progress in local storage
- **High Score Tracking**: Compete for the best performance
- **Responsive Design**: Play on desktop or mobile devices

## How to Play

1. **Trading**: Use the action panel to buy and sell stocks by ticker symbol
2. **Time Management**: Advance ticks to progress through the trading day (6 ticks per day, 30 days total)
3. **Phone Calls**: Answer incoming calls to manage your life stats - ignoring them has consequences!
4. **Financial Services**: Call contacts for loans, insurance, broker tips, and more
5. **Goal**: Maximize your net worth while keeping happiness, health, and business above critical levels

## Getting Started

### Installation

```bash
# Clone the repository
git clone /workspace/de7487d4-ddd5-4a73-bf02-bb07e43b3386/sessions/agent_51ed8825-9432-4e67-a6e8-594b9ae5673c/wall-street-ticker-web.git
cd wall-street-ticker-web

# Install dependencies
bun install

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

### Commands

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Run production build
bun lint         # Run ESLint
bun typecheck    # Run TypeScript type checking
```

## Game Mechanics

### Stock Market
- 24 companies with realistic price movements
- Momentum and volatility simulation
- Sector rotations and market-wide events
- Dividends paid randomly based on holdings
- 2-for-1 stock splits for high-priced stocks

### Life Stats
- **Happiness (0-100)**: Drops if you ignore your wife; leads to divorce at ≤10
- **Health (0-100)**: Drops if you ignore health calls; hospitalization at ≤20
- **Business (0-100)**: Drops if you ignore work calls; SEC investigation at ≤0

### Phone System
- **25+ different calls** from wife, health reminders, and business contacts
- **Multiple response options** with different time/cash/stat costs
- **Critical events** trigger at low stat levels with major financial impact
- **Outgoing calls** to bank, insurance, broker, health club, flowers, lawyer

### Scoring
Final net worth is adjusted by bonuses/penalties based on your life stats:
- Good marriage (happiness >80): +10% bonus
- Excellent health (health >80): +10% bonus  
- Strong business (business >80): +10% bonus
- Divorce: -20% penalty
- Poor health/business: -10% penalty each

## Technical Details

Built with:
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Bun** - Fast JavaScript runtime and package manager
- **Local Storage** - Game persistence

## Project Structure

```
src/
├── app/              # Next.js app router
│   ├── page.tsx      # Main game page
│   └── layout.tsx    # Root layout
├── components/       # React components
│   ├── GameUI.tsx    # Main game interface
│   ├── StatusBar.tsx # Status display
│   ├── MarketView.tsx
│   ├── PortfolioView.tsx
│   ├── NewsView.tsx
│   ├── PhoneInterface.tsx
│   └── ActionButtons.tsx
├── contexts/         # React contexts
│   └── GameContext.tsx
└── lib/              # Game logic
    ├── types.ts      # TypeScript types
    ├── game.ts       # Main game class
    ├── market.ts     # Market simulation
    ├── portfolio.ts  # Portfolio management
    ├── news.ts       # News system
    └── phone.ts      # Phone system
```

## Credits

This is a web adaptation of the original Wall Street Ticker game. All mechanics and functionality have been preserved and ported to a modern web interface with enhanced UI/UX.

## License

This project is a web adaptation of the original Wall Street Ticker game.
