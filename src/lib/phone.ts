import { 
  PhoneSystem, 
  PhoneContact, 
  PhoneCall, 
  PhoneCallData, 
  Loan, 
  PendingTip, 
  CONFIG, 
  TICKS_PER_DAY 
} from './types';

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class PhoneSystemImpl implements PhoneSystem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: any;
  happiness: number = 100;
  health: number = 100;
  business: number = 100;
  hasInsurance: boolean = false;
  hasLawyer: boolean = false;
  contacts: Record<string, PhoneContact>;
  pendingCalls: PhoneCall[] = [];
  ignoredCalls: Record<string, number> = { wife: 0, health: 0, business: 0 };
  callBalance: Record<string, number> = { wife: 0, health: 0, business: 0 };
  loan: Loan | null = null;
  pendingTip: PendingTip | null = null;
  pendingAppointment: boolean = false;
  anniversaryUsed: boolean = false;
  birthdayUsed: boolean = false;
  divorceInitiated: boolean = false;
  endDayEarly: boolean = false;
  criticalEvent: boolean = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(game: any) {
    this.game = game;
    this.contacts = this.initializeContacts();
  }

  private initializeContacts(): Record<string, PhoneContact> {
    return {
      business: {
        name: "Business",
        calls: [
          {
            message: "Boss: Urgent deadline – can you work late?",
            responses: {
              yes: { text: "I'll stay.(Ends trading day)", effect: { time_cost: "end_day", happiness: -10, health: -5, business: 10 }, outcome: "Worked late, stressed but met deadline." },
              no: { text: "Not tonight.", effect: { happiness: -5, business: -15 }, outcome: "Boss disappointed, potential performance hit." },
              delegate: { text: "I'll delegate.(-$200)", effect: { cash_cost: 200, business: 5 }, outcome: "Hired temp help, deadline saved." }
            }
          },
          {
            message: "Client: Big deal opportunity – need your input.",
            responses: {
              yes: { text: "I'm on it.(2 ticks)", effect: { time_cost: 2, happiness: 5, business: 15 }, outcome: "Potential bonus later, energized." },
              later: { text: "Schedule for tomorrow.", effect: { happiness: -2, business: -5 }, outcome: "Client annoyed, deal at risk." },
              delegate: { text: "Team handles it.(-$50)", effect: { cash_cost: 50, business: 10 }, outcome: "Delegated successfully, minor cost." }
            }
          },
          {
            message: "Colleague: Stuck on a project – can you help?",
            responses: {
              yes: { text: "Happy to help.(2 ticks)", effect: { time_cost: 2, happiness: 5, business: 0 }, outcome: "Built rapport, good karma." },
              no: { text: "Busy right now.", effect: { happiness: -3, business: -5 }, outcome: "Colleague frustrated, office tension." },
              quick: { text: "Quick advice.(1 tick)", effect: { time_cost: 1 }, outcome: "Helped briefly, minimal impact." }
            }
          },
          {
            message: "Boss: Performance review – you're getting a Bonus!",
            responses: {
              thanks: { text: "Thank you!", effect: { cash: 300, business: 15, happiness: 15 }, outcome: "Motivated, financial boost." },
              negotiate: { text: "Can it be more?", effect: { cash: 400, happiness: 10, business: 5 }, outcome: "Negotiated better raise." }
            }
          },
          {
            message: "Supplier: Delivery delay – affects our project.",
            responses: {
              yes: { text: "I'll resolve it.(2 ticks)", effect: { time_cost: 2, happiness: -5, business: 15 }, outcome: "Issue fixed, but stressful." },
              no: { text: "Not my problem.", effect: { happiness: -10, business: -20 }, outcome: "Project delayed, blame on you." },
              pay: { text: "Expedite with payment.(-$200)", effect: { cash_cost: 200, business: 10 }, outcome: "Delivery sped up, costly but effective." }
            }
          },
          {
            message: "Networking event – want to attend?",
            responses: {
              yes: { text: "Absolutely.(+$300, Ends trading day)", effect: { time_cost: "end_day", happiness: 10, cash: 300, business: 15 }, outcome: "Made connections, potential leads." },
              no: { text: "Pass this time.", effect: { happiness: -5, business: -20 }, outcome: "Missed opportunity." }
            }
          },
          {
            message: "Office party invite – come celebrate!",
            responses: {
              yes: { text: "See you there!(-$50, Ends trading day)", effect: { time_cost: "end_day", happiness: 10, cash_cost: 50 }, outcome: "Fun night, team bonding." },
              no: { text: "Can't make it.", effect: { happiness: -5, business: -5 }, outcome: "Team feels snubbed." }
            }
          },
          {
            message: "Job offer: Better position at competitor.",
            responses: {
              accept: { text: "I'm in.", effect: { cash: 500, happiness: 20, business: -20 }, outcome: "New job, big jump!" },
              decline: { text: "Staying loyal.", effect: { happiness: 5, business: 10 }, outcome: "Boss appreciates loyalty." },
              negotiate: { text: "Match the offer?", effect: { cash: 300, happiness: 10, business: 5 }, outcome: "Got a counteroffer." }
            }
          }
        ]
      },
      wife: {
        name: "Your Wife",
        calls: [
          {
            message: "Honey, can you come home early for dinner?",
            responses: {
              yes: { text: "I'll be home soon!(Ends trading day.)", effect: { happiness: 10, time_cost: "end_day" }, outcome: "You head home early, losing the rest of the trading day." },
              no: { text: "Working late again.", effect: { happiness: -5 }, outcome: "Wife sounds disappointed." },
              love: { text: "Let's order pizza.(-$50)", effect: { happiness: 5, cash_cost: 50 }, outcome: "Wife appreciates your effort." }
            }
          },
          {
            message: "Remember our anniversary tomorrow?",
            responses: {
              yes: { text: "Of course, planning something special.(2 ticks)", effect: { happiness: 15, time_cost: 2 }, outcome: "You spend time planning." },
              no: { text: "Busy with work.", effect: { happiness: -10 }, outcome: "Wife sighs sadly." },
              surprise: { text: "I've got a surprise planned!(-$250)", effect: { happiness: 20, cash_cost: 250 }, outcome: "Wife is thrilled!" }
            }
          },
          {
            message: "The kids miss you, call them?",
            responses: {
              yes: { text: "Calling now!(2 ticks)", effect: { happiness: 10, time_cost: 2 }, outcome: "Kids are happy." },
              no: { text: "Later, busy.", effect: { happiness: -5 }, outcome: "Kids are disappointed." },
              quick: { text: "Quick call!(1 tick)", effect: { happiness: 5, time_cost: 1 }, outcome: "Short call made." }
            }
          },
          {
            message: "Honey, I saw a beautiful necklace, can we get it?",
            responses: {
              yes: { text: "Sure, let's buy it! (-$200, 2 ticks)", effect: { happiness: 15, cash_cost: 200, time_cost: 2 }, outcome: "Wife is delighted." },
              no: { text: "Not now.", effect: { happiness: -10 }, outcome: "Wife is disappointed." },
              surprise: { text: "I already bought it!(-$300)", effect: { happiness: 20, cash_cost: 300 }, outcome: "Wife loves the surprise." }
            }
          },
          {
            message: "The kids want to go to the park, can you take them?",
            responses: {
              yes: { text: "Of course!(3 ticks)", effect: { happiness: 10, time_cost: 3 }, outcome: "Kids are thrilled." },
              no: { text: "Busy right now.", effect: { happiness: -5 }, outcome: "Kids are disappointed." },
              short: { text: "Just a quick one.(1 tick)", effect: { happiness: 5, time_cost: 1 }, outcome: "Kids are happy." }
            }
          },
          {
            message: "I miss you, let's have a quiet evening together.",
            responses: {
              yes: { text: "I'd love that.(Ends trading day.)", effect: { happiness: 10, time_cost: "end_day" }, outcome: "Romantic evening enjoyed. Trading day ended." },
              no: { text: "Not tonight.", effect: { happiness: -10 }, outcome: "Wife feels neglected." },
              lunch: { text: "Let's do lunch right now!(-$75)", effect: { happiness: 15, time_cost: 2, cash_cost: 75 }, outcome: "You brought her out to lunch." }
            }
          },
          {
            message: "The bills are piling up, can you help manage them?",
            responses: {
              "yes(-$500)": { text: "I'll handle it.(-$500)", effect: { happiness: 5, cash_cost: 500 }, outcome: "Financial stress relieved." },
              no: { text: "Later.", effect: { happiness: -15 }, outcome: "Arguments about money." }
            }
          },
          {
            message: "Honey, the house needs cleaning, can you help?",
            responses: {
              yes: { text: "Let's do it together.(Ends trading day)", effect: { happiness: 10, time_cost: "end_day" }, outcome: "House is clean and cozy. Trading day ended." },
              no: { text: "No time.", effect: { happiness: -5 }, outcome: "House remains messy." },
              hire: { text: "Hire a cleaner.(-$250)", effect: { happiness: 15, cash_cost: 250 }, outcome: "Housekeeper hired." }
            }
          },
          {
            message: "Let's go out for dinner tonight.",
            responses: {
              yes: { text: "Perfect!(-$200)", effect: { happiness: 15, cash_cost: 200 }, outcome: "Lovely dinner date." },
              no: { text: "Not hungry.", effect: { happiness: -10 }, outcome: "Wife is upset." }
            }
          },
          {
            message: "Happy Birthday! Let's make it special.",
            responses: {
              yes: { text: "Sounds great!(Ends trading day)", effect: { happiness: 20, time_cost: "end_day" }, outcome: "Wonderful birthday celebration." },
              no: { text: "Not today.", effect: { happiness: -10 }, outcome: "Birthday ruined." }
            }
          }
        ]
      },
      health: {
        name: "Health Reminder",
        calls: [
          {
            message: "Time for your daily exercise routine?",
            responses: {
              yes: { text: "Starting now!(2 ticks)", effect: { health: 10, time_cost: 2 }, outcome: "You exercise, advancing 2 ticks but feeling great." },
              no: { text: "No time.", effect: { health: -5 }, outcome: "Health reminder ignored." },
              short: { text: "Quick workout.(1 tick)", effect: { health: 5, time_cost: 1 }, outcome: "Short exercise done." }
            }
          },
          {
            message: "Doctor appointment reminder for tomorrow.",
            responses: {
              yes: { text: "I'll be there.(Skips 1st 2 ticks tomorrow)", effect: { health: 5 }, outcome: "Appointment confirmed." },
              reschedule: { text: "Can we reschedule?", effect: { health: -2 }, outcome: "Appointment delayed." },
              now: { text: "Let's go now.(Ends trading day)", effect: { health: 10, time_cost: "end_day" }, outcome: "You go to the doctor, ending the day early." }
            }
          },
          {
            message: "Eat healthy today - avoid junk food.",
            responses: {
              yes: { text: "Planning healthy meals.", effect: { health: 5 }, outcome: "Good eating habits." },
              no: { text: "Whatever.", effect: { health: -3 }, outcome: "Unhealthy choice noted." },
              salad: { text: "Salad for lunch!", effect: { health: 8 }, outcome: "Healthy meal planned." }
            }
          },
          {
            message: "Remember to take your vitamins today.",
            responses: {
              yes: { text: "Taken!", effect: { health: 5 }, outcome: "Vitamins boost your energy." },
              no: { text: "Forgot.", effect: { health: -3 }, outcome: "Missed dose noted." }
            }
          },
          {
            message: "Schedule a check-up soon.",
            responses: {
              yes: { text: "Booked.", effect: { health: 5 }, outcome: "Health monitored." },
              reschedule: { text: "Later.", effect: { health: -2 }, outcome: "Check-up delayed." }
            }
          },
          {
            message: "How about a walk in the park?",
            responses: {
              yes: { text: "Great idea!(2 ticks)", effect: { health: 10, time_cost: 2 }, outcome: "Refreshing walk." },
              no: { text: "No thanks.", effect: { health: -5 }, outcome: "Stayed indoors." }
            }
          },
          {
            message: "Drink more water throughout the day.",
            responses: {
              yes: { text: "Hydrating now.", effect: { health: 5 }, outcome: "Feeling hydrated." },
              no: { text: "Later.", effect: { health: -3 }, outcome: "Dehydration risk." }
            }
          }
        ]
      },
      bank: {
        name: "Bank",
        outgoing_action: "loan",
        description: "Apply for a loan ($1000, repay with 10% interest in 10 days or by Day 29)"
      },
      insurance: {
        name: "Insurance Agent",
        outgoing_action: "buy",
        cost: 50,
        description: "Buy health insurance for $50 (ongoing coverage, $50 daily premium until used)"
      },
      broker: {
        name: "Stock Broker",
        outgoing_action: "buy_tip",
        cost: CONFIG.broker_tip_cost,
        description: `Buy insider tip for $${CONFIG.broker_tip_cost}`
      },
      health_club: {
        name: "Health Club",
        outgoing_action: "join",
        cost: 200,
        description: "Join health club for $200 to boost health."
      },
      flowers: {
        name: "Flower Shop",
        outgoing_action: "buy_flowers",
        cost: 150,
        description: "Buy flowers for wife ($150, +15 happiness)"
      },
      lawyer: {
        name: "Lawyer",
        outgoing_action: "retain",
        cost: 75,
        description: "Retain lawyer for $75/day to protect against divorce and SEC financial losses."
      }
    };
  }

  checkIncomingCall(): void {
    if (Math.random() < CONFIG.incoming_call_chance) {
      const balances = {
        wife: this.callBalance.wife,
        health: this.callBalance.health,
        business: this.callBalance.business
      };

      const maxBalance = Math.max(...Object.values(balances));
      let caller: string;

      if (maxBalance > 0) {
        const candidates = Object.entries(balances)
          .filter(([, v]) => v === maxBalance)
          .map(([k]) => k);
        caller = randomChoice(candidates);
      } else {
        caller = randomChoice(["wife", "health", "business"]);
      }

      this.callBalance[caller] += 1;

      let availableCalls: PhoneCallData[] = this.contacts[caller].calls || [];

      if (caller === "wife") {
        if (this.anniversaryUsed) {
          availableCalls = availableCalls.filter(c => !c.message.toLowerCase().includes("anniversary"));
        }
        if (this.birthdayUsed) {
          availableCalls = availableCalls.filter(c => !c.message.toLowerCase().includes("birthday"));
        }
        if (this.divorceInitiated) {
          availableCalls = availableCalls.filter(c => c.message.toLowerCase().includes("kids"));
        }
        if (availableCalls.length === 0) {
          return;
        }
      }

      const callData = randomChoice(availableCalls);
      this.pendingCalls.push({
        caller,
        message: callData.message,
        responses: callData.responses,
        time: this.game.tickNumber,
        dayAdded: this.game.day
      });

      console.log("\n*** 📞 INCOMING CALL 📞 ***");
      console.log(`From: ${this.contacts[caller].name}`);
      console.log(`Message: ${callData.message}`);
      console.log("Type 'answer' to respond or 'ignore' to dismiss.");
      console.log("*** END CALL ***");
    }
  }

  answerCall(responseChoice?: string): { outcome: string; timeAdvanced: boolean } {
    if (this.pendingCalls.length === 0) {
      return { outcome: "No pending calls.", timeAdvanced: false };
    }

    const call = this.pendingCalls.shift()!;
    const caller = call.caller;
    const responses = call.responses;

    const responseKeys = Object.keys(responses);
    let responseKey: string;

    if (responseChoice && responseKeys.includes(responseChoice)) {
      responseKey = responseChoice;
    } else {
      responseKey = responseKeys[0];
    }

    const responseData = responses[responseKey];
    const effect = responseData.effect;

    console.log(`You: ${responseData.text}`);
    console.log(responseData.outcome);

    if (call.message.toLowerCase().includes("anniversary")) {
      this.anniversaryUsed = true;
    }
    if (call.message.toLowerCase().includes("birthday")) {
      this.birthdayUsed = true;
    }

    let cashOk = true;
    if (effect.cash_cost) {
      if (this.game.portfolio.cash >= effect.cash_cost) {
        this.game.portfolio.cash -= effect.cash_cost;
        console.log(`Spent $${effect.cash_cost} on the request.`);
      } else {
        console.log("Not enough cash for that.");
        cashOk = false;
        if (caller === "wife") {
          this.happiness = Math.max(0, this.happiness - 20);
          console.log("Wife is furious you promised something you can't afford!");
        } else if (caller === "health") {
          this.health = Math.max(0, this.health - 10);
          console.log("Health reminder disappointed in your financial situation.");
        }
      }
    }

    if (cashOk) {
      if (effect.cash) {
        this.game.portfolio.cash += effect.cash;
      }
      if (effect.happiness) {
        this.happiness = Math.max(0, Math.min(100, this.happiness + effect.happiness));
      }
      if (effect.health) {
        this.health = Math.max(0, Math.min(100, this.health + effect.health));
      }
      if (effect.business) {
        this.business = Math.max(0, Math.min(100, this.business + effect.business));
      }
    }

    if (caller === "health" && call.message.toLowerCase().includes("appointment") && responseKey === "yes") {
      this.pendingAppointment = true;
      console.log("Appointment scheduled for tomorrow.");
    }

    let timeAdvanced = false;
    const timeCost = effect.time_cost;

    if (timeCost === "end_day") {
      console.log("You decide to head out, ending the trading day early.");
      this.game.tickNumber = TICKS_PER_DAY;
      this.endDayEarly = true;
      timeAdvanced = true;
    } else if (typeof timeCost === "number") {
      console.log(`Time advances by ${timeCost} tick(s) as you handle this matter.`);
      const originalTick = this.game.tickNumber;
      this.game.tickNumber = Math.min(TICKS_PER_DAY, this.game.tickNumber + timeCost);
      if (originalTick + timeCost >= TICKS_PER_DAY) {
        console.log("The day ends as time advances to the end.");
        this.endDayEarly = true;
      }
      timeAdvanced = true;
    }

    return { outcome: responseData.outcome, timeAdvanced };
  }

  ignoreCall(): void {
    if (this.pendingCalls.length === 0) {
      console.log("No pending calls.");
      return;
    }

    const call = this.pendingCalls.shift()!;
    const caller = call.caller;
    this.ignoredCalls[caller] += 1;

    if (call.message.toLowerCase().includes("anniversary")) {
      this.anniversaryUsed = true;
    }
    if (call.message.toLowerCase().includes("birthday")) {
      this.birthdayUsed = true;
    }

    console.log(`Ignored call from ${this.contacts[caller].name}.`);

    if (caller === "wife") {
      this.happiness = Math.max(0, this.happiness - 15);
      const penalty = Math.floor(this.game.portfolio.cash * CONFIG.wife_attention_penalty);
      this.game.portfolio.cash -= penalty;
      console.log(`Wife unhappy: Lost $${penalty.toFixed(2)} on unnecessary spending. 😞`);
    } else if (caller === "health") {
      this.health = Math.max(0, this.health - 10);
      console.log("Health neglect: Trading performance slightly impaired. 🤒");
    } else if (caller === "business") {
      this.happiness = Math.max(0, this.happiness - 5);
      this.business = Math.max(0, this.business - 15);
      const penalty = Math.floor(this.game.portfolio.cash * 0.03);
      this.game.portfolio.cash -= penalty;
      console.log(`Business call ignored: Lost $${penalty.toFixed(2)} in potential opportunity. 💼`);
    }
  }

  makeCall(contact: string): string {
    if (!(contact in this.contacts)) {
      return "Invalid contact.";
    }

    if (contact === "broker") {
      if (this.game.portfolio.cash < this.contacts.broker.cost!) {
        return "Not enough cash for broker call.";
      }

      this.game.portfolio.cash -= this.contacts.broker.cost!;
      console.log(`Calling broker... Paid $${this.contacts.broker.cost}.`);

      if (Math.random() < CONFIG.broker_success_chance) {
        const allStocks = Object.keys(this.game.market.stocks);
        const tipStock = randomChoice(allStocks);
        const tipType = randomChoice(["positive", "negative"]);
        const effect = tipType === "positive" ? 1.05 : 0.95;
        const owned = this.game.portfolio.holdings[tipStock] > 0;
        const ownershipNote = tipType === "positive"
          ? (owned ? " (you own some - great!)" : " (consider buying)")
          : (owned ? " (consider selling)" : " (avoid buying)");
        
        console.log(`Broker: Insider tip - ${this.game.market.stocks[tipStock].name} may ${tipType === "positive" ? "rise" : "fall"}.${ownershipNote}`);
        console.log("Tip effect will apply next tick.");
        this.pendingTip = { ticker: tipStock, effect };
        return "Broker tip received.";
      } else {
        return "Broker: Sorry, no hot tips today.";
      }
    } else if (contact === "bank") {
      if (this.loan) {
        return `Current loan: $${this.loan.principal.toFixed(2)} due on Day ${this.loan.dueDay}, total due $${this.loan.totalDue.toFixed(2)}`;
      } else {
        const amount = 1000;
        const interest = 0.1;
        const dueDay = Math.min(this.game.day + 10, this.game.maxDays - 1);
        const totalDue = amount * (1 + interest);
        this.loan = { principal: amount, dueDay, interest, totalDue };
        this.game.portfolio.cash += amount;
        return `Loan approved: $${amount.toFixed(2)} at ${interest * 100}% interest. Total due: $${totalDue.toFixed(2)} by Day ${dueDay}.`;
      }
    } else if (contact === "insurance") {
      if (this.hasInsurance) {
        return "You already have health insurance.";
      }
      if (this.game.portfolio.cash < this.contacts.insurance.cost!) {
        return "Not enough cash for health insurance.";
      }
      this.game.portfolio.cash -= this.contacts.insurance.cost!;
      this.hasInsurance = true;
      return `Health insurance purchased! Paid $${this.contacts.insurance.cost}. $50 daily premium until used.`;
    } else if (contact === "health_club") {
      if (this.game.portfolio.cash < this.contacts.health_club.cost!) {
        return "Not enough cash for health club.";
      }
      this.game.portfolio.cash -= this.contacts.health_club.cost!;
      this.health = Math.min(100, this.health + 20);
      return `Joined health club! Paid $${this.contacts.health_club.cost}. Health boosted.`;
    } else if (contact === "flowers") {
      if (this.game.portfolio.cash < 150) {
        return "Not enough cash for flowers.";
      }
      this.game.portfolio.cash -= 150;
      this.happiness = Math.min(100, this.happiness + 15);
      return "Bought beautiful flowers for your wife! Happiness +15.";
    } else if (contact === "lawyer") {
      if (this.hasLawyer) {
        return "Lawyer already retained.";
      }
      if (this.game.portfolio.cash < 75) {
        return "Not enough cash for first lawyer premium.";
      }
      this.game.portfolio.cash -= 75;
      this.hasLawyer = true;
      return "Lawyer retained! $75 daily premium. Protects against divorce and SEC financial losses.";
    }

    return "Contact not implemented.";
  }

  dailyReset(): void {
    this.criticalEvent = false;
    this.game.tickNumber = 0;

    if (this.pendingAppointment) {
      console.log("You have a doctor appointment today.");
      console.log("Time advances by 2 ticks for the appointment.");
      this.game.tickNumber = 2;
      const oldHealth = this.health;
      this.health = Math.min(100, this.health + 10);
      console.log(`Appointment completed. Health improved by ${this.health - oldHealth}.`);
      this.pendingAppointment = false;
    }

    if (this.game.day > 1) {
      if (this.happiness <= 10) {
        console.log("🚨 CRITICAL: Your marriage is on the brink! Divorce proceedings initiated.");
        if (this.hasLawyer) {
          console.log("Your lawyer protects you from financial loss in divorce.");
        } else {
          const loss = Math.floor(this.game.portfolio.netWorth(this.game.market) * 0.5);
          this.game.portfolio.cash -= loss;
          console.log(`Divorce settlement: Lost $${loss} in legal fees and asset division. 💔`);
        }
        this.happiness = 50;
        this.health = Math.max(0, this.health - 20);
        this.divorceInitiated = true;
        this.criticalEvent = true;
        console.log("Happiness reset to 50, health reduced by stress.");
      } else if (this.happiness < 50) {
        const penalty = Math.floor((100 - this.happiness) * 0.5);
        this.game.portfolio.cash -= penalty;
        console.log(`Low happiness: Spent $${penalty} on gifts/flowers to appease wife. 💐`);
      } else if (this.happiness > 80) {
        const bonus = Math.floor(this.happiness * 0.2);
        this.game.portfolio.cash += bonus;
        console.log(`Good relationship: Wife gave you $${bonus} as encouragement. 😊`);
      }

      if (this.health <= 0) {
        console.log("💀 CRITICAL: Your health has failed you completely. Game over.");
        this.game.gameEnded = true;
        return;
      } else if (this.health <= 20) {
        console.log("🏥 CRITICAL: Hospitalized due to poor health!");
        if (this.hasInsurance) {
          console.log("Health insurance covers the hospital bill. Insurance claim filed.");
          this.hasInsurance = false;
        } else {
          const hospitalCost = 1000;
          this.game.portfolio.cash -= hospitalCost;
          console.log(`Hospital bill: $${hospitalCost.toFixed(2)}.`);
        }
        console.log("Time advances 3 days for recovery.");
        this.health = Math.min(100, this.health + 40);
        this.game.day += 3;
        this.criticalEvent = true;
        console.log(`Health improved to ${this.health} after treatment.`);
      } else if (this.health < 50) {
        console.log("Poor health: Trading feels more erratic. 🤒");
      } else if (this.health > 80) {
        console.log("Good health: Trading with extra focus. 💪");
      }

      if (this.business <= 0) {
        console.log("🚨 CRITICAL: Investigated by the SEC due to complete business failure!");
        if (this.hasLawyer) {
          console.log("Your lawyer prevents financial loss from SEC investigation.");
          this.business = 25;
          console.log("Business rating reset to 25. No fine.");
        } else {
          const netWorth = this.game.portfolio.netWorth(this.game.market);
          const secFine = Math.floor(netWorth * 0.1);
          this.game.portfolio.cash -= secFine;
          console.log(`SEC fine: Lost $${secFine.toFixed(2)}.`);
          this.business = 25;
        }
        this.criticalEvent = true;
      } else if (this.business < 50) {
        const penalty = Math.floor(this.business * 0.5);
        this.game.portfolio.cash -= penalty;
        console.log(`Poor business standing: Lost $${penalty.toFixed(2)} in opportunity costs. Volatility increased.`);
      }
    }

    if (this.hasInsurance) {
      if (this.game.portfolio.cash >= 50) {
        this.game.portfolio.cash -= 50;
        console.log("Insurance premium: $50");
      } else {
        this.hasInsurance = false;
        console.log("Couldn't afford insurance premium. Insurance cancelled.");
      }
    }

    if (this.hasLawyer) {
      if (this.game.portfolio.cash >= 75) {
        this.game.portfolio.cash -= 75;
        console.log("Lawyer premium: $75");
      } else {
        this.hasLawyer = false;
        console.log("Couldn't afford lawyer premium. Lawyer fired.");
      }
    }

    if (this.loan && this.game.day === this.loan.dueDay - 1) {
      console.log(`🚨 CRITICAL: Loan payment due tomorrow! Total due: $${this.loan.totalDue.toFixed(2)}`);
      this.criticalEvent = true;
    }

    this.ignoredCalls = { wife: 0, health: 0, business: 0 };
    this.callBalance = { wife: 0, health: 0, business: 0 };
  }

  checkLoanRepayment(): void {
    if (this.loan && this.game.day >= this.loan.dueDay) {
      const totalDue = this.loan.totalDue;
      if (this.game.portfolio.cash >= totalDue) {
        this.game.portfolio.cash -= totalDue;
        console.log(`Loan repaid: $${totalDue.toFixed(2)}`);
        this.loan = null;
      } else {
        console.log("Couldn't repay loan. Bankruptcy!");
        this.game.portfolio.cash = 0;
        this.loan = null;
      }
    }
  }

  getStatus() {
    return {
      pendingCalls: this.pendingCalls.length,
      happiness: this.happiness,
      health: this.health,
      business: this.business
    };
  }
}
