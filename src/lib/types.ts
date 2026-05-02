// Game configuration constants
export const CONFIG = {
  sector_rotation_chance: 0.05,
  breakout_chance: 0.01,
  crash_chance: 0.2,
  bounce_chance: 0.2,
  misinterpret_chance: 0.1,
  dividend_chance: 0.2,
  insider_tip_chance: 0.05,
  split_chance: 0.02,
  intraday_news_chance: 0.5,
  user_focus_news_chance: 0.15,
  incoming_call_chance: 0.1,
  wife_attention_penalty: 0.05,
  health_penalty: 0.1,
  broker_tip_cost: 100,
  broker_success_chance: 0.8,
};

export const TICKS_PER_DAY = 6;
export const MAX_DAYS = 30;
export const STARTING_CASH = 5000;

// Stock interface
export interface Stock {
  name: string;
  price: number;
  sector: string;
  dividend: number;
  momentum: number;
  history: number[];
  volatility: number;
  splitHistory: string[];
}

// Stock data for initialization
export interface StockData {
  name: string;
  price: number;
  sector: string;
  dividend: number;
}

// Market interface
export interface Market {
  stocks: Record<string, Stock>;
}

// Portfolio interface
export interface Portfolio {
  cash: number;
  holdings: Record<string, number>;
  costBasis: Record<string, number>;
}

// News event interface
export interface NewsEvent {
  text: string;
  targets: string[];
  effect: number;
  category: string;
  type: string;
  duration?: number;
  isFollowUp?: boolean;
}

// Phone call interface
export interface PhoneCall {
  caller: string;
  message: string;
  responses: Record<string, PhoneResponse>;
  time: number;
  dayAdded: number;
}

export interface PhoneResponse {
  text: string;
  effect: PhoneEffect;
  outcome: string;
}

export interface PhoneEffect {
  time_cost?: number | 'end_day';
  cash?: number;
  cash_cost?: number;
  happiness?: number;
  health?: number;
  business?: number;
}

// Phone system interface
export interface PhoneSystem {
  happiness: number;
  health: number;
  business: number;
  hasInsurance: boolean;
  hasLawyer: boolean;
  contacts: Record<string, PhoneContact>;
  pendingCalls: PhoneCall[];
  ignoredCalls: Record<string, number>;
  callBalance: Record<string, number>;
  loan: Loan | null;
  pendingTip: PendingTip | null;
  pendingAppointment: boolean;
  anniversaryUsed: boolean;
  birthdayUsed: boolean;
  divorceInitiated: boolean;
  endDayEarly: boolean;
  criticalEvent: boolean;
}

export interface PhoneContact {
  name: string;
  calls?: PhoneCallData[];
  outgoing_action?: string;
  cost?: number;
  description?: string;
}

export interface PhoneCallData {
  message: string;
  responses: Record<string, PhoneResponse>;
}

export interface Loan {
  principal: number;
  dueDay: number;
  interest: number;
  totalDue: number;
}

export interface PendingTip {
  ticker: string;
  effect: number;
}

// Game state interface
export interface GameState {
  day: number;
  maxDays: number;
  tickNumber: number;
  gameEnded: boolean;
  resuming: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  market: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  portfolio: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  news: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phone: any;
  highScores: HighScore[];
  splitsHappened: boolean;
}

export interface HighScore {
  name: string;
  score: number;
}

// News system interface
export interface NewsSystem {
  newsHistory: Record<string, NewsEntry[]>;
  current: NewsEvent[];
  activeEffects: NewsEvent[];
  sequentialEvents: SequentialEvent[];
}

export interface NewsEntry {
  day: number;
  tick: number;
  text: string;
  effect: number;
  category: string;
}

export interface SequentialEvent {
  trigger: string;
  followUp: string;
  delay: number;
  targets: string[];
}

// Game actions
export type GameAction =
  | { type: 'ADVANCE_TICK' }
  | { type: 'BUY_STOCK'; ticker: string; amount: number }
  | { type: 'SELL_STOCK'; ticker: string; amount: number }
  | { type: 'ANSWER_CALL' }
  | { type: 'IGNORE_CALL' }
  | { type: 'MAKE_CALL'; contact: string }
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME' }
  | { type: 'NEW_GAME' }
  | { type: 'AUTO_ADVANCE' }
  | { type: 'SHOW_HIGH_SCORES' }
  | { type: 'FINALIZE_GAME' };
