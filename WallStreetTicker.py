import random
import json
import os
import time
import sys
import platform

if platform.system() == 'Windows':
    import msvcrt
    def key_pressed():
        return msvcrt.kbhit()
    def get_key():
        return msvcrt.getch().decode('utf-8')  # Ensure string
else:
    import select
    import termios
    import tty
    def key_pressed():
        return select.select([sys.stdin], [], [], 0)[0] != []
    def get_key():
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ch

SAVE_FILE = "savegame.json"
HIGHSCORE_FILE = "highscore.json"

CONFIG = {
    "sector_rotation_chance": 0.05,
    "breakout_chance": 0.01,
    "crash_chance": 0.2,
    "bounce_chance": 0.2,
    "misinterpret_chance": 0.1,
    "dividend_chance": 0.2,
    "insider_tip_chance": 0.05,
    "split_chance": 0.02, # should be 0.02, changed for testing
    "intraday_news_chance": 0.5,
    "user_focus_news_chance": 0.15,
    "incoming_call_chance": 0.1, #should be 0.2, changed for testing
    "wife_attention_penalty": 0.05,
    "health_penalty": 0.1,
    "broker_tip_cost": 100,
    "broker_success_chance": 0.8,
}

TICKS_PER_DAY = 6

class PhoneSystem:
    """Handles phone calls, life aspects, and related mechanics."""
    def __init__(self, game):
        self.game = game
        self.happiness = 100
        self.health = 100
        self.business = 100
        self.has_insurance = False
        self.has_lawyer = False
        self.contacts = {
            "business": {
                "name": "Business",
                "calls": [
                    {
                        "message": "Boss: Urgent deadline – can you work late?",
                        "responses": {
                            "yes": {"text": "I'll stay.(Ends trading day)", "effect": {"time_cost": "end_day", "happiness": -10, "health": -5, "business": 10}, "outcome": "Worked late, stressed but met deadline."},
                            "no": {"text": "Not tonight.", "effect": {"happiness": -5, "business": -15}, "outcome": "Boss disappointed, potential performance hit."},
                            "delegate": {"text": "I'll delegate.(-$200)", "effect": {"cash_cost": 200, "business": 5}, "outcome": "Hired temp help, deadline saved."}
                        }
                    },
                    {
                        "message": "Client: Big deal opportunity – need your input.",
                        "responses": {
                            "yes": {"text": "I'm on it.(2 ticks)", "effect": {"time_cost": 2, "happiness": 5, "business": 15}, "outcome": "Potential bonus later, energized."},
                            "later": {"text": "Schedule for tomorrow.", "effect": {"happiness": -2, "business": -5}, "outcome": "Client annoyed, deal at risk."},
                            "delegate": {"text": "Team handles it.(-$50)", "effect": {"cash_cost": 50, "business": 10}, "outcome": "Delegated successfully, minor cost."}
                        }
                    },
                    {
                        "message": "Colleague: Stuck on a project – can you help?",
                        "responses": {
                            "yes": {"text": "Happy to help.(2 ticks)", "effect": {"time_cost": 2, "happiness": 5, "business": 0}, "outcome": "Built rapport, good karma."},
                            "no": {"text": "Busy right now.", "effect": {"happiness": -3, "business": -5}, "outcome": "Colleague frustrated, office tension."},
                            "quick": {"text": "Quick advice.(1 tick)", "effect": {"time_cost": 1}, "outcome": "Helped briefly, minimal impact."}
                        }
                    },
                    {
                        "message": "Boss: Performance review – you're getting a Bonus!",
                        "responses": {
                            "thanks": {"text": "Thank you!", "effect": {"cash": 300, "business": 15, "happiness": 15}, "outcome": "Motivated, financial boost."},
                            "negotiate": {"text": "Can it be more?", "effect": {"cash": 400, "happiness": 10, "business": 5}, "outcome": "Negotiated better raise."}
                        }
                    },
                    {
                        "message": "Supplier: Delivery delay – affects our project.",
                        "responses": {
                            "yes": {"text": "I'll resolve it.(2 ticks)", "effect": {"time_cost": 2, "happiness": -5, "business": 15}, "outcome": "Issue fixed, but stressful."},
                            "no": {"text": "Not my problem.", "effect": {"happiness": -10, "business": -20}, "outcome": "Project delayed, blame on you."},
                            "pay": {"text": "Expedite with payment.(-$200)", "effect": {"cash_cost": 200, "business": 10}, "outcome": "Delivery sped up, costly but effective."}
                        }
                    },
                    {
                        "message": "Networking event – want to attend?",
                        "responses": {
                            "yes": {"text": "Absolutely.(+$300, Ends trading day)", "effect": {"time_cost": "end_day", "happiness": 10, "cash": 300, "business": 15}, "outcome": "Made connections, potential leads."},
                            "no": {"text": "Pass this time.", "effect": {"happiness": -5, "business": -20}, "outcome": "Missed opportunity."}
                        }
                    },
                    {
                        "message": "Office party invite – come celebrate!",
                        "responses": {
                            "yes": {"text": "See you there!(-$50, Ends trading day)", "effect": {"time_cost": "end_day", "happiness": 10, "cash_cost": 50}, "outcome": "Fun night, team bonding."},
                            "no": {"text": "Can't make it.", "effect": {"happiness": -5, "business": -5}, "outcome": "Team feels snubbed."}
                        }
                    },
                    {
                        "message": "Job offer: Better position at competitor.",
                        "responses": {
                            "accept": {"text": "I'm in.", "effect": {"cash": 500, "happiness": 20, "business": -20}, "outcome": "New job, big jump!"},
                            "decline": {"text": "Staying loyal.", "effect": {"happiness": 5, "business": 10}, "outcome": "Boss appreciates loyalty."},
                            "negotiate": {"text": "Match the offer?", "effect": {"cash": 300, "happiness": 10, "business": 5}, "outcome": "Got a counteroffer."}
                        }
                    }
                ]
            },
            "wife": {
                "name": "Your Wife",
                "calls": [
                    {
                        "message": "Honey, can you come home early for dinner?",
                        "responses": {
                            "yes": {"text": "I'll be home soon!(Ends trading day.)", "effect": {"happiness": 10, "time_cost": "end_day"}, "outcome": "You head home early, losing the rest of the trading day."},
                            "no": {"text": "Working late again.", "effect": {"happiness": -5}, "outcome": "Wife sounds disappointed."},
                            "love": {"text": "Let's order pizza.(-$50)", "effect": {"happiness": 5, "cash_cost": 50}, "outcome": "Wife appreciates your effort."}
                        }
                    },
                    {
                        "message": "Remember our anniversary tomorrow?",
                        "responses": {
                            "yes": {"text": "Of course, planning something special.(2 ticks)", "effect": {"happiness": 15, "time_cost": 2}, "outcome": "You spend time planning."},
                            "no": {"text": "Busy with work.", "effect": {"happiness": -10}, "outcome": "Wife sighs sadly."},
                            "surprise": {"text": "I've got a surprise planned!(-$250)", "effect": {"happiness": 20, "cash_cost": 250}, "outcome": "Wife is thrilled!" }
                        }
                    },
                    {
                        "message": "The kids miss you, call them?",
                        "responses": {
                            "yes": {"text": "Calling now!(2 ticks)", "effect": {"happiness": 10, "time_cost": 2}, "outcome": "Kids are happy."},
                            "no": {"text": "Later, busy.", "effect": {"happiness": -5}, "outcome": "Kids are disappointed."},
                            "quick": {"text": "Quick call!(1 tick)", "effect": {"happiness": 5, "time_cost": 1}, "outcome": "Short call made."}
                        }
                    },
                    {
                        "message": "Honey, I saw a beautiful necklace, can we get it?",
                        "responses": {
                            "yes": {"text": "Sure, let's buy it! (-$200, 2 ticks)", "effect": {"happiness": 15, "cash_cost": 200, "time_cost": 2}, "outcome": "Wife is delighted."},
                            "no": {"text": "Not now.", "effect": {"happiness": -10}, "outcome": "Wife is disappointed."},
                            "surprise": {"text": "I already bought it!(-$300)", "effect": {"happiness": 20, "cash_cost": 300}, "outcome": "Wife loves the surprise."}
                        }
                    },
                    {
                        "message": "The kids want to go to the park, can you take them?",
                        "responses": {
                            "yes": {"text": "Of course!(3 ticks)", "effect": {"happiness": 10, "time_cost": 3}, "outcome": "Kids are thrilled."},
                            "no": {"text": "Busy right now.", "effect": {"happiness": -5}, "outcome": "Kids are disappointed."},
                            "short": {"text": "Just a quick one.(1 tick)", "effect": {"happiness": 5, "time_cost": 1}, "outcome": "Kids are happy."}
                        }
                    },
                    {
                        "message": "I miss you, let's have a quiet evening together.",
                        "responses": {
                            "yes": {"text": "I'd love that.(Ends trading day.)", "effect": {"happiness": 10, "time_cost": "end_day"}, "outcome": "Romantic evening enjoyed. Trading day ended."},
                            "no": {"text": "Not tonight.", "effect": {"happiness": -10}, "outcome": "Wife feels neglected."},
                            "lunch": {"text": "Let's do lunch right now!(-$75)", "effect": {"happiness": 15, "time_cost": 2, "cash_cost": 75}, "outcome": "You brought her out to lunch."}
                        }
                    },
                    {
                        "message": "The bills are piling up, can you help manage them?",
                        "responses": {
                            "yes(-$500)": {"text": "I'll handle it.(-$500)", "effect": {"happiness": 5, "cash_cost": 500}, "outcome": "Financial stress relieved."},
                            "no": {"text": "Later.", "effect": {"happiness": -15}, "outcome": "Arguments about money."}
                        }
                    },
                    {
                        "message": "Honey, the house needs cleaning, can you help?",
                        "responses": {
                            "yes": {"text": "Let's do it together.(Ends trading day)", "effect": {"happiness": 10, "time_cost": "end_day"}, "outcome": "House is clean and cozy. Trading day ended."},
                            "no": {"text": "No time.", "effect": {"happiness": -5}, "outcome": "House remains messy."},
                            "hire": {"text": "Hire a cleaner.(-$250)", "effect": {"happiness": 15, "cash_cost": 250}, "outcome": "Housekeeper hired."}
                        }
                    },
                    {
                        "message": "Let's go out for dinner tonight.",
                        "responses": {
                            "yes": {"text": "Perfect!(-$200)", "effect": {"happiness": 15, "cash_cost": 200}, "outcome": "Lovely dinner date."},
                            "no": {"text": "Not hungry.", "effect": {"happiness": -10}, "outcome": "Wife is upset."}
                        }
                    },
                    {
                        "message": "Happy Birthday! Let's make it special.",
                        "responses": {
                            "yes": {"text": "Sounds great!(Ends trading day)", "effect": {"happiness": 20, "time_cost": "end_day"}, "outcome": "Wonderful birthday celebration."},
                            "no": {"text": "Not today.", "effect": {"happiness": -10}, "outcome": "Birthday ruined."}
                        }
                    }
                ]
            },
            "health": {
                "name": "Health Reminder",
                "calls": [
                    {
                        "message": "Time for your daily exercise routine?",
                        "responses": {
                            "yes": {"text": "Starting now!(2 ticks)", "effect": {"health": 10, "time_cost": 2}, "outcome": "You exercise, advancing 2 ticks but feeling great."},
                            "no": {"text": "No time.", "effect": {"health": -5}, "outcome": "Health reminder ignored."},
                            "short": {"text": "Quick workout.(1 tick)", "effect": {"health": 5, "time_cost": 1}, "outcome": "Short exercise done."}
                        }
                    },
                    {
                        "message": "Doctor appointment reminder for tomorrow.",
                        "responses": {
                            "yes": {"text": "I'll be there.(Skips 1st 2 ticks tomorrow)", "effect": {"health": 5}, "outcome": "Appointment confirmed."},
                            "reschedule": {"text": "Can we reschedule?", "effect": {"health": -2}, "outcome": "Appointment delayed."},
                            "now": {"text": "Let's go now.(Ends trading day)", "effect": {"health": 10, "time_cost": "end_day"}, "outcome": "You go to the doctor, ending the day early."}
                        }
                    },
                    {
                        "message": "Eat healthy today - avoid junk food.",
                        "responses": {
                            "yes": {"text": "Planning healthy meals.", "effect": {"health": 5}, "outcome": "Good eating habits."},
                            "no": {"text": "Whatever.", "effect": {"health": -3}, "outcome": "Unhealthy choice noted."},
                            "salad": {"text": "Salad for lunch!", "effect": {"health": 8}, "outcome": "Healthy meal planned."}
                        }
                    },
                    {
                        "message": "Remember to take your vitamins today.",
                        "responses": {
                            "yes": {"text": "Taken!", "effect": {"health": 5}, "outcome": "Vitamins boost your energy."},
                            "no": {"text": "Forgot.", "effect": {"health": -3}, "outcome": "Missed dose noted."}
                        }
                    },
                    {
                        "message": "Schedule a check-up soon.",
                        "responses": {
                            "yes": {"text": "Booked.", "effect": {"health": 5}, "outcome": "Health monitored."},
                            "reschedule": {"text": "Later.", "effect": {"health": -2}, "outcome": "Check-up delayed."}
                        }
                    },
                    {
                        "message": "How about a walk in the park?",
                        "responses": {
                            "yes": {"text": "Great idea!(2 ticks)", "effect": {"health": 10, "time_cost": 2}, "outcome": "Refreshing walk."},
                            "no": {"text": "No thanks.", "effect": {"health": -5}, "outcome": "Stayed indoors."}
                        }
                    },
                    {
                        "message": "Drink more water throughout the day.",
                        "responses": {
                            "yes": {"text": "Hydrating now.", "effect": {"health": 5}, "outcome": "Feeling hydrated."},
                            "no": {"text": "Later.", "effect": {"health": -3}, "outcome": "Dehydration risk."}
                        }
                    }
                ]
            },
            "bank": {
                "name": "Bank",
                "outgoing_action": "loan",
                "description": "Apply for a loan ($1000, repay with 10% interest in 10 days or by Day 29)"
            },
            "insurance": {
                "name": "Insurance Agent",
                "outgoing_action": "buy",
                "cost": 50,
                "description": "Buy health insurance for $50 (ongoing coverage, $50 daily premium until used)"
            },
            "broker": {
                "name": "Stock Broker",
                "outgoing_action": "buy_tip",
                "cost": CONFIG["broker_tip_cost"],
                "description": "Buy insider tip for $" + str(CONFIG["broker_tip_cost"])
            },
            "health_club": {
                "name": "Health Club",
                "outgoing_action": "join",
                "cost": 200,
                "description": "Join health club for $200 to boost health."
            },
            "flowers": {
                "name": "Flower Shop",
                "outgoing_action": "buy_flowers",
                "cost": 150,
                "description": "Buy flowers for wife ($150, +15 happiness)"
            },
            "lawyer": {
                "name": "Lawyer",
                "outgoing_action": "retain",
                "cost": 75,
                "description": "Retain lawyer for $75/day to protect against divorce and SEC financial losses."
            }
        }
        self.pending_calls = []
        self.ignored_calls = {"wife": 0, "health": 0, "business": 0}
        self.call_balance = {"wife": 0, "health": 0, "business": 0}
        self.loan = None
        self.pending_tip = None
        self.pending_appointment = None
        self.anniversary_used = False
        self.birthday_used = False
        self.divorce_initiated = False
        self.end_day_early = False
        self.critical_event = False

    def check_incoming_call(self):
        if random.random() < CONFIG["incoming_call_chance"]:
            balances = {"wife": self.call_balance["wife"], "health": self.call_balance["health"], "business": self.call_balance["business"]}
            max_balance = max(balances.values())
            if max_balance > 0:
                candidates = [k for k, v in balances.items() if v == max_balance]
                caller = random.choice(candidates)
            else:
                caller = random.choice(["wife", "health", "business"])
            self.call_balance[caller] += 1
            if caller == "wife":
                available_calls = self.contacts[caller]["calls"]
                if self.anniversary_used:
                    available_calls = [c for c in available_calls if "anniversary" not in c["message"].lower()]
                if self.birthday_used:
                    available_calls = [c for c in available_calls if "birthday" not in c["message"].lower()]
                if self.divorce_initiated:
                    available_calls = [c for c in available_calls if "kids" in c["message"].lower()]
                if not available_calls:
                    return  # No calls available
                call_data = random.choice(available_calls)
            else:
                call_data = random.choice(self.contacts[caller]["calls"])
            self.pending_calls.append({
                "caller": caller,
                "message": call_data["message"],
                "responses": call_data["responses"],
                "time": self.game.tick_number,
                "day_added": self.game.day
            })
            print("\n*** 📞 INCOMING CALL 📞 ***")
            for _ in range(3):
                print("📞 Ring! 📞")
                print('\a', end='', flush=True)  # Audible bell
                time.sleep(0.75)
            print(f"From: {self.contacts[caller]['name']}")
            print(f"Message: {call_data['message']}")
            print("Type 'answer' to respond or 'ignore' to dismiss.")
            print("*** END CALL ***")

    def answer_call(self):
        if not self.pending_calls:
            print("No pending calls.")
            return

        call = self.pending_calls.pop(0)
        caller = call["caller"]
        responses = call["responses"]

        print("Choose response:")
        for i, key in enumerate(responses.keys(), 1):
            print(f"{i}. {responses[key]['text']}")
        try:
            choice = int(input("Response: ")) - 1
            response_key = list(responses.keys())[choice]
            response_data = responses[response_key]
        except:
            print("Invalid choice, defaulting to neutral.")
            response_key = list(responses.keys())[0]
            response_data = responses[response_key]

        print(f"You: {response_data['text']}")
        print(response_data["outcome"])

        if "anniversary" in call["message"].lower():
            self.anniversary_used = True
        if "birthday" in call["message"].lower():
            self.birthday_used = True

        effect = response_data["effect"]
        cash_ok = True
        if "cash_cost" in effect:
            cost = effect["cash_cost"]
            if self.game.portfolio.cash >= cost:
                self.game.portfolio.cash -= cost
                print(f"Spent ${cost} on the request.")
            else:
                print("Not enough cash for that.")
                cash_ok = False
                if caller == "wife":
                    self.happiness = max(0, self.happiness - 20)
                    print("Wife is furious you promised something you can't afford!")
                elif caller == "health":
                    self.health = max(0, self.health - 10)
                    print("Health reminder disappointed in your financial situation.")

        if cash_ok:
            if "cash" in effect:
                self.game.portfolio.cash += effect["cash"]
            if "happiness" in effect:
                self.happiness = max(0, min(100, self.happiness + effect["happiness"]))
            if "health" in effect:
                self.health = max(0, min(100, self.health + effect["health"]))
            if "business" in effect:
                if not hasattr(self, 'business'):
                    self.business = 100
                self.business = max(0, min(100, self.business + effect["business"]))

        # Set pending appointment for doctor confirmation
        if caller == "health" and "appointment" in call["message"].lower() and response_key == "yes":
            self.pending_appointment = True
            print("Appointment scheduled for tomorrow.")

        time_cost = effect.get("time_cost")
        time_advanced = False
        if time_cost == "end_day":
            print("You decide to head out, ending the trading day early.")
            self.game.tick_number = TICKS_PER_DAY
            self.end_day_early = True
            time_advanced = True
        elif isinstance(time_cost, int):
            print(f"Time advances by {time_cost} tick(s) as you handle this matter.")
            original_tick = self.game.tick_number
            self.game.tick_number = min(TICKS_PER_DAY, self.game.tick_number + time_cost)
            if original_tick + time_cost >= TICKS_PER_DAY:
                print("The day ends as time advances to the end.")
                self.end_day_early = True
            time_advanced = True
        
        self.game.show_status()

    def ignore_call(self):
        if not self.pending_calls:
            print("No pending calls.")
            return

        call = self.pending_calls.pop(0)
        caller = call["caller"]
        self.ignored_calls[caller] += 1
        if "anniversary" in call["message"].lower():
            self.anniversary_used = True
        if "birthday" in call["message"].lower():
            self.birthday_used = True

        print(f"Ignored call from {self.contacts[caller]['name']}.")

        if caller == "wife":
            self.happiness = max(0, self.happiness - 15)
            penalty = int(self.game.portfolio.cash * CONFIG["wife_attention_penalty"])
            self.game.portfolio.cash -= penalty
            print(f"Wife unhappy: Lost ${penalty:.2f} on unnecessary spending. 😞")

        elif caller == "health":
            self.health = max(0, self.health - 10)
            for _ in range(int(CONFIG["health_penalty"] * 10)):
                random_stock = random.choice(list(self.game.market.stocks.keys()))
                self.game.market.stocks[random_stock]["price"] *= random.uniform(0.99, 1.01)
            print("Health neglect: Trading performance slightly impaired. 🤒")

        elif caller == "business":
            if not hasattr(self, 'business'):
                self.business = 100
            self.happiness = max(0, self.happiness - 5)
            self.business = max(0, self.business - 15)
            penalty = int(self.game.portfolio.cash * 0.03)
            self.game.portfolio.cash -= penalty
            print(f"Business call ignored: Lost ${penalty:.2f} in potential opportunity. 💼")

        self.game.show_status()

    def make_call(self, contact):
        if contact not in self.contacts:
            print("Invalid contact.")
            return

        if contact == "broker":
            if self.game.portfolio.cash < self.contacts["broker"]["cost"]:
                print("Not enough cash for broker call.")
                return

            self.game.portfolio.cash -= self.contacts["broker"]["cost"]
            print(f"Calling broker... Paid ${self.contacts['broker']['cost']}.")

            if random.random() < CONFIG["broker_success_chance"]:
                all_stocks = list(self.game.market.stocks.keys())
                tip_stock = random.choice(all_stocks)
                tip_type = random.choice(["positive", "negative"])
                effect = 1.05 if tip_type == "positive" else 0.95
                owned = self.game.portfolio.holdings[tip_stock] > 0
                if tip_type == "positive":
                    ownership_note = " (you own some - great!)" if owned else " (consider buying)"
                else:
                    ownership_note = " (consider selling)" if owned else " (avoid buying)"
                print(f"Broker: Insider tip - {self.game.market.stocks[tip_stock]['name']} may {'rise' if tip_type == 'positive' else 'fall'}.{ownership_note}")
                print("Tip effect will apply next tick.")
                self.pending_tip = {"ticker": tip_stock, "effect": effect}
            else:
                print("Broker: Sorry, no hot tips today.")

        elif contact == "bank":
            if self.loan:
                print(f"Current loan: ${self.loan['principal']:.2f} due on Day {self.loan['due_day']}, total due ${self.loan['total_due']:.2f}")
                try:
                    repay_amount = float(input("Enter amount to repay early (0 to cancel): ").strip())
                except ValueError:
                    print("Invalid amount.")
                    return
                if repay_amount <= 0:
                    print("Cancelled.")
                    return
                if repay_amount > self.game.portfolio.cash:
                    print("Not enough cash.")
                    return
                self.game.portfolio.cash -= repay_amount
                self.loan["total_due"] -= repay_amount
                if self.loan["total_due"] <= 0:
                    print("Loan fully repaid early!")
                    self.loan = None
                else:
                    print(f"Repaid ${repay_amount:.2f}. Remaining due: ${self.loan['total_due']:.2f}")
            else:
                amount = 1000
                interest = 0.1
                due_day = min(self.game.day + 10, self.game.max_days - 1)
                total_due = amount * (1 + interest)
                self.loan = {"principal": amount, "due_day": due_day, "interest": interest, "total_due": total_due}
                self.game.portfolio.cash += amount
                print(f"Loan approved: ${amount:.2f} at {interest*100}% interest. Total due: ${total_due:.2f} by Day {due_day}.")

        elif contact == "insurance":
            if self.has_insurance:
                print("You already have health insurance.")
                return
            if self.game.portfolio.cash < self.contacts["insurance"]["cost"]:
                print("Not enough cash for health insurance.")
                return

            self.game.portfolio.cash -= self.contacts["insurance"]["cost"]
            self.has_insurance = True
            print(f"Health insurance purchased! Paid ${self.contacts['insurance']['cost']}. $50 daily premium until used.")

        elif contact == "health_club":
            if self.game.portfolio.cash < self.contacts["health_club"]["cost"]:
                print("Not enough cash for health club.")
                return

            self.game.portfolio.cash -= self.contacts["health_club"]["cost"]
            self.health = min(100, self.health + 20)
            print(f"Joined health club! Paid ${self.contacts['health_club']['cost']}. Health boosted.")

        elif contact == "flowers":
            if self.game.portfolio.cash < 150:
                print("Not enough cash for flowers.")
            else:
                self.game.portfolio.cash -= 150
                self.happiness = min(100, self.happiness + 15)
                print("Bought beautiful flowers for your wife! Happiness +15.")

        elif contact == "lawyer":
            if self.has_lawyer:
                print("Lawyer already retained.")
            else:
                if self.game.portfolio.cash < 75:
                    print("Not enough cash for first lawyer premium.")
                else:
                    self.game.portfolio.cash -= 75
                    self.has_lawyer = True
                    print("Lawyer retained! $75 daily premium. Protects against divorce and SEC financial losses.")

    def daily_reset(self):
        self.critical_event = False
        self.game.tick_number = 0
        if self.pending_appointment:
            print("You have a doctor appointment today.")
            print("Time advances by 2 ticks for the appointment.")
            for i in range(2):
                self.game.market.tick([], i + 1, self.game.portfolio.holdings, self)
            self.game.tick_number = 2
            old_health = self.health
            self.health = min(100, self.health + 10)
            print(f"Appointment completed. Health improved by {self.health - old_health}.")
            self.pending_appointment = None
            self.game.show_status()

        if self.game.day > 1:
            if self.happiness <= 10:
                print("🚨 CRITICAL: Your marriage is on the brink! Divorce proceedings initiated.")
                if self.has_lawyer:
                    print("Your lawyer protects you from financial loss in divorce.")
                else:
                    loss = int(self.game.portfolio.net_worth(self.market) * 0.5)
                    self.game.portfolio.cash -= loss
                    print(f"Divorce settlement: Lost ${loss} in legal fees and asset division. 💔")
                self.happiness = 50  # Reset to neutral
                self.health = max(0, self.health - 20)  # Stress impact
                self.divorce_initiated = True
                self.critical_event = True
                print("Happiness reset to 50, health reduced by stress.")
            elif self.happiness < 50:
                penalty = int((100 - self.happiness) * 0.5)
                self.game.portfolio.cash -= penalty
                print(f"Low happiness: Spent ${penalty} on gifts/flowers to appease wife. 💐")
            elif self.happiness > 80:
                bonus = int(self.happiness * 0.2)
                self.game.portfolio.cash += bonus
                print(f"Good relationship: Wife gave you ${bonus} as encouragement. 😊")

            if self.health <= 0:
                print("💀 CRITICAL: Your health has failed you completely. Game over.")
                self.game.game_ended = True
                return
            elif self.health <= 20:
                print("🏥 CRITICAL: Hospitalized due to poor health!")
                if self.has_insurance:
                    print("Health insurance covers the hospital bill. Insurance claim filed.")
                    self.has_insurance = False
                else:
                    hospital_cost = 1000
                    self.game.portfolio.cash -= hospital_cost
                    print(f"Hospital bill: ${hospital_cost:.2f}.")
                print("Time advances 3 days for recovery.")
                self.health = min(100, self.health + 40)
                self.game.day += 3  # Advance days
                self.critical_event = True
                print(f"Health improved to {self.health} after treatment.")
            elif self.health < 50:
                impairment = (100 - self.health) / 100
                for s in self.game.market.stocks.values():
                    s["volatility"] *= (1 + impairment * 0.1)
                print("Poor health: Trading feels more erratic. 🤒")
            elif self.health > 80:
                bonus = (self.health - 80) / 20 * 0.01
                for s in self.game.market.stocks.values():
                    s["price"] *= (1 + bonus)
                print("Good health: Trading with extra focus. 💪")

            if self.business <= 0:
                print("🚨 CRITICAL: Investigated by the SEC due to complete business failure!")
                if self.has_lawyer:
                    print("Your lawyer prevents financial loss from SEC investigation.")
                    self.business = 25
                    print("Business rating reset to 25. No fine.")
                else:
                    net_worth = self.game.portfolio.net_worth(self.market)
                    sec_fine = int(net_worth * 0.1)
                    self.game.portfolio.cash -= sec_fine
                    print(f"SEC fine: Lost ${sec_fine:.2f}.")
                    self.business = 25  # Reset to low
                self.critical_event = True
            elif self.business < 50:
                impairment = (100 - self.business) / 100
                for s in self.game.market.stocks.values():
                    s["volatility"] *= (1 + impairment * 0.05)
                penalty = int(self.business * 0.5)
                self.game.portfolio.cash -= penalty
                print(f"Poor business standing: Lost ${penalty:.2f} in opportunity costs. Volatility increased.")

        if self.has_insurance:
            if self.game.portfolio.cash >= 50:
                self.game.portfolio.cash -= 50
                print("Insurance premium: $50")
            else:
                self.has_insurance = False
                print("Couldn't afford insurance premium. Insurance cancelled.")

        if self.has_lawyer:
            if self.game.portfolio.cash >= 75:
                self.game.portfolio.cash -= 75
                print("Lawyer premium: $75")
            else:
                self.has_lawyer = False
                print("Couldn't afford lawyer premium. Lawyer fired.")

        if self.loan and self.game.day == self.loan["due_day"] - 1:
            total_due = self.loan["total_due"]
            print(f"🚨 CRITICAL: Loan payment due tomorrow! Total due: ${total_due:.2f}")
            self.critical_event = True

        self.ignored_calls = {"wife": 0, "health": 0, "business": 0}
        self.call_balance = {"wife": 0, "health": 0, "business": 0}

    def check_loan_repayment(self):
        if self.loan and self.game.day >= self.loan["due_day"]:
            total_due = self.loan["total_due"]
            if self.game.portfolio.cash >= total_due:
                self.game.portfolio.cash -= total_due
                print(f"Loan repaid: ${total_due:.2f}")
                self.loan = None
            else:
                print("Couldn't repay loan. Bankruptcy!")
                self.game.portfolio.cash = 0
                self.loan = None

    def get_status(self):
        return {
            "pending_calls": len(self.pending_calls),
            "happiness": self.happiness,
            "health": self.health,
            "business": self.business
        }

class Market:
    """Manages stock prices, ticks, dividends, and splits."""

    def __init__(self, game=None):
        self.game = game
        self.stocks = {
            "AAPL": {"name": "Apple", "price": 150.0, "sector": "Tech", "dividend": 0.5},
            "MSFT": {"name": "Microsoft", "price": 320.0, "sector": "Tech", "dividend": 0.8},
            "GOOGL": {"name": "Alphabet", "price": 140.0, "sector": "Tech", "dividend": 0.3},
            "AMZN": {"name": "Amazon", "price": 130.0, "sector": "Retail", "dividend": 0.2},
            "TSLA": {"name": "Tesla", "price": 200.0, "sector": "Auto", "dividend": 0.1},
            "META": {"name": "Meta", "price": 250.0, "sector": "Tech", "dividend": 0.4},
            "NVDA": {"name": "Nvidia", "price": 450.0, "sector": "Tech", "dividend": 0.6},
            "JPM": {"name": "JPMorgan Chase", "price": 140.0, "sector": "Finance", "dividend": 1.0},
            "BAC": {"name": "Bank of America", "price": 35.0, "sector": "Finance", "dividend": 0.7},
            "WMT": {"name": "Walmart", "price": 160.0, "sector": "Retail", "dividend": 0.9},
            "TGT": {"name": "Target", "price": 130.0, "sector": "Retail", "dividend": 0.5},
            "KO": {"name": "Coca-Cola", "price": 60.0, "sector": "Consumer", "dividend": 0.8},
            "PEP": {"name": "PepsiCo", "price": 180.0, "sector": "Consumer", "dividend": 1.2},
            "XOM": {"name": "ExxonMobil", "price": 110.0, "sector": "Energy", "dividend": 1.5},
            "CVX": {"name": "Chevron", "price": 155.0, "sector": "Energy", "dividend": 1.3},
            "DIS": {"name": "Disney", "price": 90.0, "sector": "Streaming", "dividend": 0.6},
            "NFLX": {"name": "Netflix", "price": 400.0, "sector": "Streaming", "dividend": 0.8},
            "INTC": {"name": "Intel", "price": 35.0, "sector": "Tech", "dividend": 0.4},
            "AMD": {"name": "AMD", "price": 120.0, "sector": "Tech", "dividend": 0.3},
            "BA": {"name": "Boeing", "price": 210.0, "sector": "Industrial", "dividend": 0.8},
            "GE": {"name": "General Electric", "price": 140.0, "sector": "Industrial", "dividend": 0.6},
            "F": {"name": "Ford", "price": 12.0, "sector": "Auto", "dividend": 0.5},
            "GM": {"name": "General Motors", "price": 38.0, "sector": "Auto", "dividend": 0.7},
            "UBER": {"name": "Uber", "price": 70.0, "sector": "Tech", "dividend": 0.0}
        }

        for s in self.stocks.values():
            s["momentum"] = 0.0
            s["history"] = [s["price"]]
            s["volatility"] = random.uniform(0.8, 1.3)
            s["split_history"] = []

    def process_dividends(self, portfolio):
        total_dividend = 0.0
        for ticker, amt in portfolio.holdings.items():
            if amt > 0 and random.random() < CONFIG["dividend_chance"]:
                dividend = self.stocks[ticker]["dividend"] * amt
                portfolio.cash += dividend
                total_dividend += dividend
                print(f"💰 Dividend from {ticker}: ${dividend:.2f}")
        return total_dividend

    def process_splits(self, portfolio=None):
        if portfolio is None:
            portfolio = self.game.portfolio
        splits_happened = False
        for ticker, s in self.stocks.items():
            if s["price"] > 500 and random.random() < CONFIG["split_chance"]:
                s["price"] /= 2
                s["dividend"] /= 2
                portfolio.holdings[ticker] *= 2
                s.setdefault("split_history", []).append(f"Day {self.game.day}")
                splits_happened = True
                print(f"📈 {ticker} splits 2-for-1! Price and dividend halved. Shares doubled.")
        return splits_happened

    def tick(self, effects, tick_number, portfolio_holdings, phone_system):
        applied_news = []

        if phone_system.pending_tip:
            tip = phone_system.pending_tip
            ticker = tip["ticker"]
            effect = tip["effect"]
            if ticker in self.stocks:
                self.stocks[ticker]["price"] *= effect
                self.stocks[ticker]["price"] = round(self.stocks[ticker]["price"], 2)
                print(f"💡 Broker tip effect applied: {ticker} price adjusted.")
            phone_system.pending_tip = None

        if random.random() < CONFIG["sector_rotation_chance"]:
            sectors = list(set(s["sector"] for s in self.stocks.values()))
            sector = random.choice(sectors)
            print(f"\n🔄 Tick {tick_number}: Sector rotation: {sector} gaining momentum!")
            for s in self.stocks.values():
                if s["sector"] == sector:
                    s["momentum"] += 0.02

        for ticker, s in self.stocks.items():
            base_price = s["price"]
            trend = random.uniform(-0.01, 0.01)
            noise = random.uniform(-0.02 * s["volatility"], 0.02 * s["volatility"])
            if tick_number >= 4:
                noise *= 1.3
            momentum_effect = s["momentum"] * 0.3
            change = trend + noise + momentum_effect
            price = base_price * (1 + change)

            total_effect = 1.0
            for e in effects:
                if ticker in e["targets"]:
                    decay_factor = 1 + ((e["effect"] - 1) * (e["duration"] / 4))
                    effect = decay_factor
                    if random.random() < CONFIG["misinterpret_chance"]:
                        effect = 1 / effect
                    total_effect *= effect
                    applied_news.append((ticker, e["text"], effect))

            price *= total_effect

            hist = s["history"][-5:]
            if len(hist) >= 5 and hist[-1] > hist[0] * 1.25 and random.random() < CONFIG["crash_chance"]:
                price *= random.uniform(0.6, 0.85)
                print(f"⚠️ {ticker} corrected sharply!")
            if len(hist) >= 3 and hist[-1] < hist[-3] * 0.85 and random.random() < CONFIG["bounce_chance"]:
                price *= random.uniform(1.1, 1.25)
                print(f"💥 {ticker} bounced sharply!")

            if random.random() < CONFIG["breakout_chance"]:
                price *= random.uniform(1.1, 1.3)
                print(f"🚀 {ticker} is breaking out!")

            s["momentum"] = (s["momentum"] * 0.7) + (change * 0.3)
            s["price"] = max(1.0, round(price, 2))
            s["history"].append(s["price"])
            if len(s["history"]) > 50:
                s["history"].pop(0)

        return applied_news

class NewsSystem:
    def __init__(self, market):
        self.market = market
        self.news_history = {}
        self.current = []
        self.active_effects = []
        self.sequential_events = []

        self.pool = [
            {"text": "Tech booming.", "targets": ["AAPL","MSFT","NVDA","AMD","META","UBER"], "effect": 1.08, "category": "positive", "type": "sector"},
            {"text": "Tech selloff.", "targets": ["AAPL","MSFT","NVDA","AMD","META","UBER"], "effect": 0.92, "category": "negative", "type": "sector"},
            {"text": "New AI breakthrough announced.", "targets": ["NVDA","AMD","MSFT","GOOGL"], "effect": 1.10, "category": "positive", "type": "innovation"},
            {"text": "Data privacy concerns rise.", "targets": ["META","GOOGL","AAPL"], "effect": 0.95, "category": "negative", "type": "regulatory"},
            {"text": "Apple announces new iPhone.", "targets": ["AAPL"], "effect": 1.12, "category": "positive", "type": "product"},
            {"text": "Microsoft acquires AI startup.", "targets": ["MSFT"], "effect": 1.08, "category": "positive", "type": "merger"},
            {"text": "Google faces antitrust fine.", "targets": ["GOOGL"], "effect": 0.90, "category": "negative", "type": "legal"},
            {"text": "Meta launches new VR headset.", "targets": ["META"], "effect": 1.06, "category": "positive", "type": "product"},
            {"text": "Nvidia GPU shortages continue.", "targets": ["NVDA"], "effect": 0.94, "category": "negative", "type": "supply"},
            {"text": "AMD launches competitive chip.", "targets": ["AMD"], "effect": 1.07, "category": "positive", "type": "product"},
            {"text": "Uber reports strong ride-sharing growth.", "targets": ["UBER"], "effect": 1.09, "category": "positive", "type": "earnings"},
            {"text": "Auto sales surge.", "targets": ["F","GM","TSLA"], "effect": 1.08, "category": "positive", "type": "demand"},
            {"text": "Auto slowdown.", "targets": ["F","GM","TSLA"], "effect": 0.92, "category": "negative", "type": "economic"},
            {"text": "Tesla unveils new EV model.", "targets": ["TSLA"], "effect": 1.15, "category": "positive", "type": "innovation"},
            {"text": "Oil spike.", "targets": ["XOM","CVX"], "effect": 1.08, "category": "positive", "type": "commodity"},
            {"text": "Oil glut.", "targets": ["XOM","CVX"], "effect": 0.92, "category": "negative", "type": "commodity"},
            {"text": "Banks strong.", "targets": ["JPM","BAC"], "effect": 1.08, "category": "positive", "type": "earnings"},
            {"text": "Banks weak.", "targets": ["JPM","BAC"], "effect": 0.92, "category": "negative", "type": "economic"},
            {"text": "Retail strong.", "targets": ["WMT","TGT","AMZN"], "effect": 1.08, "category": "positive", "type": "demand"},
            {"text": "Retail weak.", "targets": ["WMT","TGT","AMZN"], "effect": 0.92, "category": "negative", "type": "competition"},
            {"text": "Streaming Strong.", "targets": ["DIS","NFLX"], "effect": 1.08, "category": "positive", "type": "demand"},
            {"text": "Streaming Weak.", "targets": ["DIS","NFLX"], "effect": 0.92, "category": "negative", "type": "competition"},
            {"text": "Global economy strengthens.", "targets": list(self.market.stocks.keys()), "effect": 1.03, "category": "positive", "type": "economic"},
            {"text": "Recession fears grow.", "targets": list(self.market.stocks.keys()), "effect": 0.97, "category": "negative", "type": "economic"},
        ]

    def get_random_event(self, user_holdings=None):
        base = random.choice(self.pool)

        if user_holdings and random.random() < CONFIG["user_focus_news_chance"]:
            owned_news = [n for n in self.pool if any(t in user_holdings for t in n["targets"])]
            if owned_news:
                base = random.choice(owned_news)

        if self.active_effects and random.random() < 0.3:
            e = random.choice(self.active_effects)
            return {
                "text": f"{e['text']} reversing.",
                "targets": e["targets"],
                "effect": 1 / e["effect"],
                "category": "neutral",
                "type": "reversal"
            }

        return base

    def add_event(self, event):
        new_sectors = set()
        for t in event["targets"]:
            if t in self.market.stocks:
                new_sectors.add(self.market.stocks[t]["sector"])
        self.active_effects = [
            e for e in self.active_effects
            if not new_sectors & {self.market.stocks[t]["sector"] for t in e["targets"] if t in self.market.stocks}
        ]
        new_event = {**event, "duration": random.randint(2, 4)}
        self.active_effects.append(new_event)
        self.current.append(event)
        if ("announces" in event["text"].lower() or "launches" in event["text"].lower()) and not event.get("is_follow_up", False):
            self.sequential_events.append({
                "trigger": event["text"],
                "follow_up": self.generate_follow_up(event),
                "delay": random.randint(1, 3),
                "targets": event["targets"]
            })

    def generate_follow_up(self, original_event):
        follow_ups = [
            "Market reacts positively to recent announcement.",
            "Analysts adjust forecasts following news.",
            "Competitors respond to new developments.",
            "Investor sentiment shifts after update."
        ]
        return random.choice(follow_ups)

    def process_sequential_events(self):
        for seq in self.sequential_events[:]:
            seq["delay"] -= 1
            if seq["delay"] <= 0:
                follow_up = {
                    "text": f"{seq['follow_up']} ({seq['trigger']})",
                    "targets": seq["targets"],
                    "effect": random.uniform(0.98, 1.05),
                    "category": "neutral",
                    "is_follow_up": True
                }
                self.add_event(follow_up)
                self.sequential_events.remove(seq)

    def generate_insider_tip(self, portfolio):
        if random.random() < CONFIG["insider_tip_chance"]:
            owned = [t for t, amt in portfolio.holdings.items() if amt > 0]
            if owned:
                tip_stock = random.choice(owned)
                tip_type = random.choice(["positive", "negative"])
                effect = 1.05 if tip_type == "positive" else 0.95
                print(f"🕵️ Insider tip: {self.market.stocks[tip_stock]['name']} may {'rise' if tip_type == 'positive' else 'fall'} soon.")
                self.market.stocks[tip_stock]["price"] *= effect
                self.market.stocks[tip_stock]["price"] = round(self.market.stocks[tip_stock]["price"], 2)

    def generate(self, user_holdings=None):
        self.current = []
        used_sectors = set()
        shuffled = self.pool[:]
        random.shuffle(shuffled)
        for n in shuffled:
            sectors = set()
            for t in n["targets"]:
                if t in self.market.stocks:
                    sectors.add(self.market.stocks[t]["sector"])
            if not sectors & used_sectors:
                if user_holdings and any(t in user_holdings for t in n["targets"]):
                    if random.random() < 0.2:
                        self.current.append(n)
                        used_sectors.update(sectors)
                        continue
                self.current.append(n)
                used_sectors.update(sectors)
            if len(self.current) == 3:
                break
        self.active_effects = [
            {**n, "duration": random.randint(2, 4)} for n in self.current
        ]

    def decay(self):
        for e in self.active_effects:
            e["duration"] -= 1
        self.active_effects = [e for e in self.active_effects if e["duration"] > 0]

class Portfolio:
    def __init__(self, market):
        self.cash = 5000.0
        self.holdings = {t: 0 for t in market.stocks}
        self.cost_basis = {t: 0.0 for t in market.stocks}

    def net_worth(self, market):
        return self.cash + sum(
            market.stocks[t]["price"] * self.holdings[t] for t in self.holdings
        )

    def buy(self, ticker, amount, market):
        if ticker not in market.stocks:
            print("Invalid ticker.")
            return False
        cost = market.stocks[ticker]["price"] * amount
        if cost > self.cash:
            print("Not enough cash.")
            return False
        self.cash -= cost
        self.holdings[ticker] += amount
        self.cost_basis[ticker] += cost
        print(f"Bought {amount} shares of {ticker} for ${cost:.2f}.")
        return True

    def sell(self, ticker, amount, market):
        if ticker not in market.stocks:
            print("Invalid ticker.")
            return False
        if amount > self.holdings[ticker]:
            print("Not enough shares.")
            return False
        proceeds = market.stocks[ticker]["price"] * amount
        self.cash += proceeds
        self.holdings[ticker] -= amount
        print(f"Sold {amount} shares of {ticker} for ${proceeds:.2f}.")
        return True

class Game:
    def __init__(self):
        self.day = 1
        self.max_days = 30
        self.tick_number = 0
        self.game_ended = False
        self.resuming = False
        self.dark_mode = True
        self.market = Market(self)
        self.portfolio = Portfolio(self.market)
        self.news = NewsSystem(self.market)
        self.phone = PhoneSystem(self)
        self.high_scores = self.load_high_scores()
        self.splits_happened = False

    def show_help(self):
        print("\nCommands:")
        print(" buy / sell            Interactive trade")
        print(" buy TICKER AMT        Quick buy")
        print(" sell TICKER AMT       Quick sell")
        print(" info [TICKER]         View stock details")
        print(" news                  Current news")
        print(" portfolio             View holdings")
        print(" phone                 Phone menu (calls, contacts)")
        print(" answer                Answer incoming call")
        print(" ignore                Ignore incoming call")
        print(" status                Show current status")
        print(" auto                  Auto-advance ticks until call or key press")
        print(" highscore             Show high scores")
        print(" save / load           Save or load game")
        print(" tick                  Advance time")
        print(" exit                  Quit game")
        print(" help                  Show this menu")

    def auto_advance(self):
        if not hasattr(self, 'game_ended'):
            self.game_ended = False
        self.splits_happened = False
        print("Auto-advancing ticks. Press any key to stop.")
        while True:
            if self.tick_number >= TICKS_PER_DAY:
                print(f"\n--- End of Day {self.day} ---")
                self.day += 1
                if self.day > self.max_days:
                    self.finalize_game()
                    return
                if not self.resuming:
                    self.phone.daily_reset()
                    if self.game_ended or self.phone.critical_event:
                        break
                    self.market.process_dividends(self.portfolio)
                    self.splits_happened = self.market.process_splits(self.portfolio)
                self.resuming = False
                self.tick_number = 0

            if not self.resuming:
                    self.tick_number += 1
            self.resuming = False

            if self.tick_number == 1:
                self.news.generate([t for t, amt in self.portfolio.holdings.items() if amt > 0])

            applied = self.market.tick(self.news.active_effects, self.tick_number, self.portfolio.holdings, self.phone)

            for ticker, text, effect in applied:
                category = next((n["category"] for n in self.news.pool if n["text"] == text), "neutral")
                self.news.news_history.setdefault(ticker, []).append({
                    "day": self.day,
                    "tick": self.tick_number,
                    "text": text,
                    "effect": effect,
                    "category": category
                })

            self.news.decay()
            self.news.process_sequential_events()

            self.phone.check_incoming_call()

            if random.random() < CONFIG["intraday_news_chance"]:
                event = self.news.get_random_event([t for t, amt in self.portfolio.holdings.items() if amt > 0])
                if event:
                    print(f"\nBREAKING: {event['text']}")
                    self.news.add_event(event)

            self.show_status()

            if self.phone.pending_calls:
                    call = self.phone.pending_calls[0]
                    pending_ticks = (self.day - call["day_added"]) * TICKS_PER_DAY + (self.tick_number - call["time"])
                    if pending_ticks >= 2:
                        self.phone.ignore_call()

            time.sleep(.1) # changed for testing from 1

            if self.splits_happened:
                print("Auto-advance stopped due to stock split(s).")
                break

            if self.phone.pending_calls:
                call = self.phone.pending_calls[0]
                pending_ticks = (self.day - call["day_added"]) * TICKS_PER_DAY + (self.tick_number - call["time"])
                if pending_ticks >= 2:
                    self.phone.ignore_call()
                else:
                    break

            self.phone.check_loan_repayment()
            
            # Check for key press
            if key_pressed():
                get_key()  # Consume the key
                print("Auto-advance stopped by key press.")
                break

    def show_status(self):
        phone_status = self.phone.get_status()
        print(f"\n--- DAY {self.day} | TICK {self.tick_number} ---")
        print(f"Cash: ${self.portfolio.cash:.2f} | Net Worth: ${self.portfolio.net_worth(self.market):.2f}")
        print(f"Happiness: {phone_status['happiness']}% | Health: {phone_status['health']}% | Business: {phone_status['business']}% | Pending Calls: {phone_status['pending_calls']}")

        if self.news.active_effects:
            print("\nActive News:")
            for e in self.news.active_effects:
                targets_display = ", ".join(e["targets"][:5]) + ("..." if len(e["targets"]) > 5 else "")
                emoji = {"positive": "🟢", "negative": "🔴", "neutral": "🟡"}.get(e.get("category", "neutral"), "🟡")
                print(f"{emoji} {e['text']} ({e['duration']} ticks) → [{targets_display}]")

        print("\nMarket Overview:")
        movers = []
        for t, s in self.market.stocks.items():
            prev = s["history"][-2] if len(s["history"]) > 1 else s["price"]
            change = s["price"] - prev
            symbol = "→" if change == 0 else ("▲" if change > 0 else "▼")
            movers.append((t, change))
            owned = self.portfolio.holdings[t]
            print(f"{t:5} | ${s['price']:>7.2f} {symbol} | {s['name']:<20} | {s['sector']:<12} | Owned: {owned}")

        movers.sort(key=lambda x: abs(x[1]), reverse=True)
        print("\nTop Movers:")
        for t, ch in movers[:3]:
            print(f"{t}: {ch:+.2f}")

    def show_news(self):
        print("\n📰 CURRENT NEWS:")
        if not self.news.current:
            print("No major news today.")
        for n in self.news.current:
            emoji = {"positive": "🟢", "negative": "🔴", "neutral": "🟡"}.get(n.get("category", "neutral"), "🟡")
            print(f"{emoji} {n['text']}")

    def show_portfolio(self):
        print("\n📊 PORTFOLIO:")
        phone_status = self.phone.get_status()
        total_value = 0
        holdings_count = 0
        total_pnl = 0
        for t, amt in self.portfolio.holdings.items():
            if amt > 0:
                value = amt * self.market.stocks[t]["price"]
                cost = self.portfolio.cost_basis[t]
                pnl = value - cost
                total_value += value
                total_pnl += pnl
                holdings_count += 1
                sector = self.market.stocks[t]["sector"]
                pct_portfolio = (value / self.portfolio.net_worth(self.market)) * 100 if self.portfolio.net_worth(self.market) > 0 else 0
                print(f"{t}: {amt} shares @ ${self.market.stocks[t]['price']:.2f} = ${value:.2f} (Cost: ${cost:.2f}, P/L: ${pnl:+.2f}) ({sector}, {pct_portfolio:.1f}% of portfolio)")

        net_worth = self.portfolio.net_worth(self.market)
        cash_pct = (self.portfolio.cash / net_worth) * 100 if net_worth > 0 else 0
        holdings_pct = (total_value / net_worth) * 100 if net_worth > 0 else 0

        print(f"\nTotal Holdings Value: ${total_value:.2f} ({holdings_pct:.1f}% of net worth)")
        print(f"Total Unrealized P/L: ${total_pnl:+.2f}")
        print(f"Cash: ${self.portfolio.cash:.2f} ({cash_pct:.1f}% of net worth)")
        print(f"Net Worth: ${net_worth:.2f}")
        print(f"Stocks Held: {holdings_count}")
        print(f"Happiness: {phone_status['happiness']}% | Health: {phone_status['health']}% | Business: {phone_status['business']}% | Pending Calls: {phone_status['pending_calls']}")

        if self.phone.loan:
                        print(f"Loan: ${self.phone.loan['principal']:.2f} due on Day {self.phone.loan['due_day']}, total due ${self.phone.loan['total_due']:.2f}")

    def show_phone_menu(self):
        print("\n📞 PHONE MENU:")
        print("Contacts:")
        for contact, info in self.phone.contacts.items():
            if "outgoing_action" in info:
                print(f"  {contact.upper()}: {info['description']}")
        print("Commands: call CONTACT (e.g., call broker)")

    def stock_info(self, ticker):
        if ticker not in self.market.stocks:
            print("Invalid ticker.")
            return

        s = self.market.stocks[ticker]
        owned = self.portfolio.holdings[ticker]

        print(f"\n{'='*50}")
        print(f"{ticker} - {s['name']}")
        print(f"{'='*50}")
        print(f"Sector: {s['sector']}")
        print(f"Current Price: ${s['price']:.2f}")
        print(f"Dividend Yield: ${s['dividend']:.2f} per share")
        print(f"Owned Shares: {owned}")
        print(f"Position Value: ${owned * s['price']:.2f}")

        if len(s["history"]) > 1:
            prev = s["history"][-2]
            change = s["price"] - prev
            pct = (change / prev) * 100 if prev != 0 else 0
            print(f"Change: {change:+.2f} ({pct:+.2f}%)")

        print(f"Momentum: {s['momentum']:.4f}")
        print(f"Volatility: {s['volatility']:.2f}")

        hist = s["history"][-10:]
        if hist:
            mn, mx = min(hist), max(hist)
            scale = mx - mn or 1
            graph = "".join("▁▂▃▄▅▆▇█"[int((p - mn) / scale * 7)] for p in hist)
            print(f"Price History (last {len(hist)} ticks): {mn:.2f} {graph} {mx:.2f}")
            print("Recent prices:", ", ".join(f"${p:.2f}" for p in hist))
            if len(hist) > 1:
                trend = "Up" if hist[-1] > hist[0] else "Down" if hist[-1] < hist[0] else "Flat"
                avg_change = (hist[-1] - hist[0]) / (len(hist) - 1)
                print(f"Trend: {trend} (avg change: {avg_change:+.2f} per tick)")

        if "split_history" in s and s["split_history"]:
            print(f"Split History: {', '.join(s['split_history'])}")

        print("\nRecent News Impact:")
        if ticker in self.news.news_history:
            for n in self.news.news_history[ticker][-5:]:
                emoji = {"positive": "🟢", "negative": "🔴", "neutral": "🟡"}.get(n.get("category", "neutral"), "🟡")
                print(f"Day {n['day']} Tick {n.get('tick', 0)}: {emoji} {n['text']} ({n['effect']:.2f})")
        else:
            print("No recent news.")
        print(f"{'='*50}")

    def transact(self, action, ticker=None, amount=None):
        if self.phone.business <= 20 and random.random() < 0.2:
            print("Trade failed due to poor business reputation.")
            return

        if not ticker:
            ticker = input("Ticker: ").upper().strip()
        if not amount:
            try:
                amount = int(input("Amount: ").strip())
            except ValueError:
                print("Invalid amount. Please enter a number.")
                return

        success = False
        if action == "buy":
            success = self.portfolio.buy(ticker, amount, self.market)
        else:
            success = self.portfolio.sell(ticker, amount, self.market)

        if success:
            self.show_status()

    def run(self):
        print("")
        print("Welcome to Wall Street Kid Enhanced with Phone Calls!")
        print("Balance trading with personal life: answer calls from wife, health, and business.")
        print("Buy insider tips from the broker via phone calls.")
        print("Watch your business reputation – poor standing can cause trade failures or SEC investigations!")
        print("")
        print("*****************************************")
        print("Type 'help' for available commands...")
        print("*****************************************")

        while self.day <= self.max_days:
            if not self.resuming:
                self.news.generate_insider_tip(self.portfolio)
                self.market.process_dividends(self.portfolio)
                self.splits_happened = self.market.process_splits(self.portfolio)
                self.phone.daily_reset()
            self.resuming = False
            
            while self.tick_number < TICKS_PER_DAY:
                if not self.resuming:
                    self.tick_number += 1
                self.resuming = False

                if self.tick_number == 1:
                    self.news.generate([t for t, amt in self.portfolio.holdings.items() if amt > 0])

                applied = self.market.tick(self.news.active_effects, self.tick_number, self.portfolio.holdings, self.phone)

                for ticker, text, effect in applied:
                    category = next((n["category"] for n in self.news.pool if n["text"] == text), "neutral")
                    self.news.news_history.setdefault(ticker, []).append({
                        "day": self.day,
                        "tick": self.tick_number,
                        "text": text,
                        "effect": effect,
                        "category": category
                    })

                self.news.decay()
                self.news.process_sequential_events()

                self.phone.check_incoming_call()

                if random.random() < CONFIG["intraday_news_chance"]:
                    event = self.news.get_random_event([t for t, amt in self.portfolio.holdings.items() if amt > 0])
                    if event:
                        print(f"\nBREAKING: {event['text']}")
                        self.news.add_event(event)

                self.show_status()

                if self.phone.pending_calls:
                    call = self.phone.pending_calls[0]
                    pending_ticks = (self.day - call["day_added"]) * TICKS_PER_DAY + (self.tick_number - call["time"])
                    if pending_ticks >= 2:
                        self.phone.ignore_call()

                while True:
                    if self.phone.end_day_early:
                        self.phone.end_day_early = False
                        break
                    try:
                        cmd = input("\n> ").lower().strip().split()
                        if not cmd:
                            continue

                        if cmd[0] == "tick":
                            break
                        elif cmd[0] == "exit":
                            return
                        elif cmd[0] == "buy" and len(cmd) == 3:
                            self.transact("buy", cmd[1].upper(), int(cmd[2]))
                        elif cmd[0] == "sell" and len(cmd) == 3:
                            self.transact("sell", cmd[1].upper(), int(cmd[2]))
                        elif cmd[0] == "buy":
                            self.transact("buy")
                        elif cmd[0] == "sell":
                            self.transact("sell")
                        elif cmd[0] == "info" and len(cmd) == 2:
                            self.stock_info(cmd[1].upper())
                        elif cmd[0] == "info":
                            ticker = input("Ticker: ").upper().strip()
                            self.stock_info(ticker)
                        elif cmd[0] == "news":
                            self.show_news()
                        elif cmd[0] == "portfolio":
                            self.show_portfolio()
                        elif cmd[0] == "phone":
                            self.show_phone_menu()
                        elif cmd[0] == "call" and len(cmd) == 2:
                            self.phone.make_call(cmd[1])
                        elif cmd[0] == "answer":
                            self.phone.answer_call()
                            if self.phone.end_day_early:
                                self.phone.end_day_early = False
                                break
                        elif cmd[0] == "ignore":
                            self.phone.ignore_call()
                        elif cmd[0] == "status":
                            self.show_status()
                        elif cmd[0] == "auto":
                            if self.day < 30:
                                self.auto_advance()
                            else:
                                print("Auto not available on the last day.")
                        elif cmd[0] == "highscore":
                            self.show_high_scores()
                        elif cmd[0] == "help":
                            self.show_help()
                        elif cmd[0] == "save":
                            self.save_game()
                        elif cmd[0] == "load":
                            if self.load_game():
                                print("Game loaded. Continuing...")
                                return self.run()
                        else:
                            print("Invalid command. Type 'help' for options.")
                    except KeyboardInterrupt:
                        print("\nExiting game...")
                        return
                    except Exception as e:
                        print(f"Error: {e}")

                if self.portfolio.cash <= 0:
                    print("💸 Bankrupt! Game over.")
                    self.finalize_game()
                    return
                
            self.phone.check_loan_repayment()

            print(f"\n--- End of Day {self.day} ---")
            self.day += 1

        self.finalize_game()

    def finalize_game(self):
        final_worth = self.portfolio.net_worth(self.market)
        print(f"\n🏁 Game Over! Base Net Worth: ${final_worth:.2f}")

        # Marriage and health modifiers
        if not self.phone.divorce_initiated:
            if self.phone.happiness > 80:
                bonus = 0.1 * final_worth
                final_worth += bonus
                print(f"Strong marriage bonus: +${bonus:.2f}")
            elif self.phone.happiness > 50:
                bonus = 0.05 * final_worth
                final_worth += bonus
                print(f"Good marriage bonus: +${bonus:.2f}")
        else:
            penalty = 0.2 * final_worth
            final_worth -= penalty
            print(f"Divorce penalty: -${penalty:.2f}")

        if self.phone.health > 80:
            bonus = 0.1 * final_worth
            final_worth += bonus
            print(f"Excellent health bonus: +${bonus:.2f}")
        elif self.phone.health > 50:
            bonus = 0.05 * final_worth
            final_worth += bonus
            print(f"Good health bonus: +${bonus:.2f}")
        else:
            penalty = 0.1 * final_worth
            final_worth -= penalty
            print(f"Poor health penalty: -${penalty:.2f}")

        if self.phone.business > 80:
            bonus = 0.1 * final_worth
            final_worth += bonus
            print(f"Excellent business bonus: +${bonus:.2f}")
        elif self.phone.business > 50:
            bonus = 0.05 * final_worth
            final_worth += bonus
            print(f"Good business bonus: +${bonus:.2f}")
        else:
            penalty = 0.1 * final_worth
            final_worth -= penalty
            print(f"Poor business penalty: -${penalty:.2f}")

        print(f"Final Adjusted Net Worth: ${final_worth:.2f}")
        if final_worth >= 25000:
            print("Wall Street Legend! Outstanding performance!")
        elif final_worth >= 20000:
            print("Wall Street Pro! Excellent trading!")
        elif final_worth >= 15000:
            print("Solid Trader! Good job.")
        elif final_worth >= 10000:
            print("Decent Start. Keep learning.")
        else:
            print("Tough market. Better luck next time!")

        if self.phone.loan:
            total_due = self.phone.loan["total_due"]
            self.portfolio.cash -= total_due
            print(f"Outstanding loan repaid: ${total_due:.2f}")
            self.phone.loan = None

        self.check_high_score(final_worth)

        self.show_high_scores()

        while True:
            choice = input("Play again? (y/n): ").lower().strip()
            if choice == 'y':
                # Reset game state
                self.__init__()
                self.run()
                return
            elif choice == 'n':
                sys.exit(0)
            else:
                print("Please enter 'y' or 'n'.")

    def load_high_scores(self):
        if os.path.exists("highscore.json"):
            try:
                with open("highscore.json", "r") as f:
                    return json.load(f)
            except:
                pass
        return [{"name": "AAAAA", "score": 100} for _ in range(10)]

    def save_high_scores(self):
        try:
            with open("highscore.json", "w") as f:
                json.dump(self.high_scores, f, indent=2)
        except Exception as e:
            print(f"Failed to save high scores: {e}")

    def check_high_score(self, final_worth):
        if len(self.high_scores) < 10 or final_worth > min(s["score"] for s in self.high_scores):
            try:
                name = input("Enter your name (12 char max): ").strip()[:12]
                if not name:
                    name = "Anonymous"
                self.high_scores.append({"name": name, "score": final_worth})
                self.high_scores.sort(key=lambda x: x["score"], reverse=True)
                self.high_scores = self.high_scores[:10]
                self.save_high_scores()
                print("High score saved!")
            except:
                print("Failed to save high score.")

    def show_high_scores(self):
        print("\n🏆 HIGH SCORES:")
        for i, hs in enumerate(self.high_scores, 1):
            print(f"{i}. {hs['name']:<12} ${hs['score']:>8,.0f}")

    def save_game(self):
        data = {
            "day": self.day,
            "tick_number": self.tick_number,
            "game_ended": self.game_ended,
            "cash": self.portfolio.cash,
            "holdings": self.portfolio.holdings,
            "cost_basis": self.portfolio.cost_basis,
            "stocks": self.market.stocks,
            "news_history": self.news.news_history,
            "sequential_events": self.news.sequential_events,
            "active_effects": self.news.active_effects,
            "current_news": self.news.current,
            "pending_calls": self.phone.pending_calls,
            "ignored_calls": self.phone.ignored_calls,
            "happiness": self.phone.happiness,
            "health": self.phone.health,
            "business": self.phone.business,
            "has_insurance": self.phone.has_insurance,
            "has_lawyer": self.phone.has_lawyer,
            "dark_mode": self.dark_mode,
            "loan": self.phone.loan,
            "pending_tip": self.phone.pending_tip,
            "call_balance": self.phone.call_balance,
            "pending_appointment": self.phone.pending_appointment,
            "birthday_used": self.phone.birthday_used,
            "divorce_initiated": self.phone.divorce_initiated,
            "anniversary_used": self.phone.anniversary_used,
            "end_day_early": self.phone.end_day_early
        }
        try:
            with open(SAVE_FILE, "w") as f:
                json.dump(data, f, indent=2)
            print("💾 Game saved successfully.")
        except Exception as e:
            print(f"Save failed: {e}")

    def load_game(self):
        if not os.path.exists(SAVE_FILE):
            print("No save file found.")
            return False
        try:
            with open(SAVE_FILE, "r") as f:
                data = json.load(f)

            self.day = data["day"]
            self.tick_number = data["tick_number"]
            self.game_ended = data.get("game_ended", False)
            if self.tick_number > 0:
                self.resuming = True
            self.portfolio.cash = data["cash"]
            self.portfolio.holdings = data["holdings"]
            self.portfolio.cost_basis = data.get("cost_basis", {t: 0.0 for t in self.market.stocks})
            self.market.stocks = data["stocks"]
            self.news.news_history = data["news_history"]
            self.news.sequential_events = data.get("sequential_events", [])
            self.news.active_effects = data.get("active_effects", [])
            self.news.current = data.get("current_news", [])
            self.phone.pending_calls = data.get("pending_calls", [])
            self.phone.ignored_calls = data.get("ignored_calls", {"wife": 0, "health": 0, "business": 0})
            self.phone.happiness = data.get("happiness", 100)
            self.phone.health = data.get("health", 100)
            self.phone.business = data.get("business", 100)
            self.phone.has_insurance = data.get("health_insurance", False)
            self.phone.has_lawyer = data.get("has_lawyer", False)
            self.dark_mode = data.get("dark_mode", False)
            self.phone.loan = data.get("loan", None)
            self.phone.pending_tip = data.get("pending_tip", None)
            self.phone.call_balance = data.get("call_balance", {"wife": 0, "health": 0, "business": 0})
            self.phone.pending_appointment = data.get("pending_appointment", None)
            self.phone.anniversary_used = data.get("anniversary_used", False)
            self.phone.birthday_used = data.get("birthday_used", False)
            self.phone.divorce_initiated = data.get("divorce_initiated", False)
            self.phone.end_day_early = data.get("end_day_early", False)

            if self.phone.loan and "total_due" not in self.phone.loan:
                self.phone.loan["total_due"] = self.phone.loan["amount"] * (1 + self.phone.loan["interest"])
                self.phone.loan["principal"] = self.phone.loan["amount"]

            for s in self.market.stocks.values():
                s.setdefault("momentum", 0.0)
                s.setdefault("history", [s["price"]])
                s.setdefault("volatility", random.uniform(0.8, 1.3))
                s.setdefault("split_history", [])

            print("📂 Game loaded successfully.")
            return True
        except Exception as e:
            print(f"Load failed: {e}")
            return False

class GUIGame:
    def __init__(self, game_instance):
        self.game = game_instance
        self.input_queue = queue.Queue()
        # Capture original input
        self.original_input = input
        self.root = tk.Tk()
        self.root.title("Wall Street Kid GUI")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        self.root.minsize(1200, 600)
        self.updating = False
        self.dark_mode = True
        self.resolution = "800x600"
        self.style = ttk.Style()
        self.style.theme_use('default')  # Or 'clam' for better look

        # Main menu
        self.show_menu()

        # Handle Ctrl+C
        import signal
        signal.signal(signal.SIGINT, self.handle_sigint)

    def show_menu(self):
        # Apply dark theme styles
        bg = '#1e1e1e'
        fg = '#ffffff'
        btn_bg = '#333333'
        btn_fg = '#ffffff'
        active_bg = '#555555'
        self.root.config(bg=bg)
        self.style.configure('TLabel', background=bg, foreground=fg)
        self.menu_frame = tk.Frame(self.root, bg=bg)
        self.menu_frame.pack(pady=50)

        tk.Label(self.menu_frame, text="Wall Street Kid", font=("Arial", 28, "bold"), bg=bg, fg=fg).pack(pady=20)
        tk.Label(self.menu_frame, text="Master the Stock Market!", font=("Arial", 16), bg=bg, fg=fg).pack(pady=10)

        self.new_game_btn = tk.Button(self.menu_frame, text="New Game", command=self.start_new_game, width=20, height=2, bg=btn_bg, fg=btn_fg, font=("Arial", 14, "bold"), relief='raised', bd=5, activebackground=active_bg)
        self.new_game_btn.pack(pady=15)

        self.load_game_btn = tk.Button(self.menu_frame, text="Load Game", command=self.start_loaded_game, width=20, height=2, bg=btn_bg, fg=btn_fg, font=("Arial", 14, "bold"), relief='raised', bd=5, activebackground=active_bg)
        self.load_game_btn.pack(pady=15)

        self.settings_btn = tk.Button(self.menu_frame, text="Settings", command=self.show_menu_settings, width=20, height=2, bg=btn_bg, fg=btn_fg, font=("Arial", 14, "bold"), relief='raised', bd=5, activebackground=active_bg)
        self.settings_btn.pack(pady=15)

        self.exit_btn = tk.Button(self.menu_frame, text="Exit", command=self.quit_gui, width=20, height=2, bg=btn_bg, fg=btn_fg, font=("Arial", 14, "bold"), relief='raised', bd=5, activebackground=active_bg)
        self.exit_btn.pack(pady=15)

    def start_new_game(self):
        self.menu_frame.destroy()
        self.setup_game_ui()
        threading.Thread(target=self.game.run, daemon=True).start()

    def start_loaded_game(self):
        # Load game first
        if self.game.load_game():
            self.menu_frame.destroy()
            self.setup_game_ui()
            threading.Thread(target=self.game.run, daemon=True).start()
        else:
            # Stay on menu or show error
            pass

    def show_menu_settings(self):
        settings_win = tk.Toplevel(self.root)
        settings_win.title("Settings")
        settings_win.geometry("400x400")
        bg, fg = ('#1e1e1e', '#ffffff') if self.dark_mode else ('white', 'black')
        settings_win.config(bg=bg)
        ttk.Label(settings_win, text="Settings").pack(pady=10)
        var = tk.BooleanVar(value=self.dark_mode)
        chk = ttk.Checkbutton(settings_win, text="Dark Mode", variable=var)
        chk.pack(pady=5)
        resolutions = ["800x600", "1024x768", "1280x720", "1366x768", "1600x900", "1920x1080"]
        ttk.Label(settings_win, text="Resolution:").pack(pady=5)
        res_var = tk.StringVar(value=self.resolution)
        res_option = ttk.Combobox(settings_win, textvariable=res_var, values=resolutions, state='readonly')
        res_option.set(self.resolution)
        res_option.pack(pady=5)
        var_full = tk.BooleanVar(value=False)
        chk_full = ttk.Checkbutton(settings_win, text="Full Screen", variable=var_full)
        chk_full.pack(pady=5)
        tk.Button(settings_win, text="Reset High Scores", command=self.reset_high_scores).pack(pady=5)
        tk.Button(settings_win, text="Clear Save Game", command=self.clear_save).pack(pady=5)
        tk.Button(settings_win, text="Apply", command=lambda: self.apply_settings(var.get(), res_var.get(), settings_win, var_full.get())).pack(pady=10)

    def apply_theme(self):
        bg, fg = ('#1e1e1e', '#ffffff') if self.dark_mode else ('white', 'black')
        try:
            self.root.config(bg=bg)
        except:
            pass
        try:
            self.style.configure('TFrame', background=bg)
            self.style.configure('TLabel', background=bg, foreground=fg)
            self.style.configure('TButton', background='#333333' if self.dark_mode else 'white', foreground=fg)
            self.style.configure('TCheckbutton', background=bg, foreground=fg)
            self.style.configure('TCombobox', fieldbackground='#333333' if self.dark_mode else 'white', background=bg, foreground=fg, selectbackground='#555555' if self.dark_mode else 'lightblue', selectforeground=fg)
            self.style.configure('TNotebook', background=bg)
            self.style.configure('TNotebook.Tab', background=bg, foreground=fg)
        except:
            pass
        # Recursively set for tk widgets
        def set_colors(widget):
            try:
                widget.config(bg=bg, fg=fg)
                if 'Text' in str(type(widget)):
                    widget.config(insertbackground=fg)
                if 'Button' in str(type(widget)):
                    widget.config(activeforeground=fg, disabledforeground=fg)
            except:
                pass
            for child in widget.winfo_children():
                set_colors(child)
        set_colors(self.root)

    def reset_high_scores(self):
        self.game.high_scores = [{"name": "AAAAA", "score": 100} for _ in range(10)]
        self.game.save_high_scores()
        print("High scores reset.")

    def clear_save(self):
        if os.path.exists(SAVE_FILE):
            os.remove(SAVE_FILE)
            print("Save game cleared.")
        else:
            print("No save file to clear.")

    def apply_settings(self, dark, res, win=None, full=False):
        self.dark_mode = dark
        self.resolution = res
        self.root.geometry(self.resolution)
        self.root.update()
        self.root.attributes('-fullscreen', full)
        self.apply_theme()
        if win:
            win.destroy()

    def setup_game_ui(self):
        # Status frame (top)
        self.status_frame = ttk.Frame(self.root, padding=10)
        self.status_frame.pack(fill=tk.X, pady=5)

        ttk.Label(self.status_frame, text="Day:").grid(row=0, column=0, sticky=tk.W)
        self.day_label = ttk.Label(self.status_frame, text="1")
        self.day_label.grid(row=0, column=1, padx=5)

        ttk.Label(self.status_frame, text="Tick:").grid(row=0, column=2, sticky=tk.W)
        self.tick_label = ttk.Label(self.status_frame, text="0")
        self.tick_label.grid(row=0, column=3, padx=5)

        ttk.Label(self.status_frame, text="Cash:").grid(row=0, column=4, sticky=tk.W)
        self.cash_label = ttk.Label(self.status_frame, text="$5000")
        self.cash_label.grid(row=0, column=5, padx=5)

        ttk.Label(self.status_frame, text="Net Worth:").grid(row=0, column=6, sticky=tk.W)
        self.net_worth_label = ttk.Label(self.status_frame, text="$5000")
        self.net_worth_label.grid(row=0, column=7, padx=5)

        # Progress bars
        ttk.Label(self.status_frame, text="Happiness:").grid(row=1, column=0, sticky=tk.W)
        self.happiness_bar = ttk.Progressbar(self.status_frame, orient="horizontal", length=100, mode="determinate")
        self.happiness_bar.grid(row=1, column=1, padx=5)

        ttk.Label(self.status_frame, text="Health:").grid(row=1, column=2, sticky=tk.W)
        self.health_bar = ttk.Progressbar(self.status_frame, orient="horizontal", length=100, mode="determinate")
        self.health_bar.grid(row=1, column=3, padx=5)

        ttk.Label(self.status_frame, text="Business:").grid(row=1, column=4, sticky=tk.W)
        self.business_bar = ttk.Progressbar(self.status_frame, orient="horizontal", length=100, mode="determinate")
        self.business_bar.grid(row=1, column=5, padx=5)

        ttk.Label(self.status_frame, text="Pending Calls:").grid(row=1, column=6, sticky=tk.W)
        self.calls_label = ttk.Label(self.status_frame, text="0")
        self.calls_label.grid(row=1, column=7, padx=5)

        # Main frame for buttons and input
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, pady=10)

        # Button frame (left side)
        self.button_frame = ttk.Frame(main_frame)
        self.button_frame.pack(side=tk.LEFT, padx=10)

        # Display frame (right side)
        self.display_frame = ttk.Frame(main_frame)
        self.display_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10)

        self.notebook = ttk.Notebook(self.display_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # Market tab
        self.market_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.market_tab, text="Market")
        self.market_text = tk.Text(self.market_tab, height=15, width=60, wrap=tk.WORD, state=tk.DISABLED, font=("Courier", 9))
        self.market_text.pack(fill=tk.BOTH, expand=True)

        # Portfolio tab
        self.portfolio_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.portfolio_tab, text="Portfolio")
        self.portfolio_text = tk.Text(self.portfolio_tab, height=15, width=60, wrap=tk.WORD, state=tk.DISABLED, font=("Courier", 9))
        self.portfolio_text.pack(fill=tk.BOTH, expand=True)

        # News tab
        self.news_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.news_tab, text="News")
        self.news_text = tk.Text(self.news_tab, height=15, width=60, wrap=tk.WORD, state=tk.DISABLED, font=("Courier", 9))
        self.news_text.pack(fill=tk.BOTH, expand=True)

        # Settings tab
        self.settings_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.settings_tab, text="Settings")
        tk.Label(self.settings_tab, text="Settings").pack(pady=10)
        var = tk.BooleanVar(value=self.dark_mode)
        chk = ttk.Checkbutton(self.settings_tab, text="Dark Mode", variable=var)
        chk.pack(pady=5)
        resolutions = ["800x600", "1024x768", "1280x720", "1366x768", "1600x900", "1920x1080"]
        ttk.Label(self.settings_tab, text="Resolution:").pack(pady=5)
        res_var = tk.StringVar(value=self.resolution)
        res_option = ttk.Combobox(self.settings_tab, textvariable=res_var, values=resolutions, state='readonly')
        res_option.set(self.resolution)
        res_option.pack(pady=5)
        var_full = tk.BooleanVar(value=False)
        chk_full = ttk.Checkbutton(self.settings_tab, text="Full Screen", variable=var_full)
        chk_full.pack(pady=5)
        ttk.Button(self.settings_tab, text="Reset High Scores", command=self.reset_high_scores).pack(pady=5)
        ttk.Button(self.settings_tab, text="Clear Save Game", command=self.clear_save).pack(pady=5)
        ttk.Button(self.settings_tab, text="Apply", command=lambda: self.apply_settings(var.get(), res_var.get(), None, var_full.get())).pack(pady=10)
        
        commands = [
            ("Buy Stock", "buy_stock", "green"),
            ("Sell Stock", "sell_stock", "orange"),
            ("Answer Call", "answer", "red"),
            ("Ignore Call", "ignore", "purple"),
            ("Status", "status", "lightblue"),
            ("Portfolio", "portfolio", "lightgreen"),
            ("Phone", "phone", "lightyellow"),
            ("News", "news", "lightcyan"),
            ("Auto", "auto", "lightgray"),
            ("Help", "help", "lightgoldenrod"),
            ("Save", "save", "lightcoral"),
            ("Load", "load", "lightpink")
        ]

        for i, (label, cmd, color) in enumerate(commands):
            fg_color = 'lime' if self.dark_mode else 'black'
            btn = tk.Button(self.button_frame, text=label, command=lambda c=cmd: self.send_command(c), bg=color, fg=fg_color, width=12, height=2)
            row = i // 4
            col = i % 4
            btn.grid(row=row, column=col, padx=5, pady=5)

        # Input frame (bottom)
        input_frame = ttk.Frame(self.root)
        input_frame.pack(fill=tk.X, pady=10)

        ttk.Label(input_frame, text="Command:").pack(side=tk.LEFT, padx=5)
        self.entry = ttk.Entry(input_frame)
        self.entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.entry.bind("<Return>", self.submit_command)

        self.submit_button = ttk.Button(input_frame, text="Submit", command=self.submit_command)
        self.submit_button.pack(side=tk.LEFT, padx=5)

        self.quit_button = ttk.Button(input_frame, text="Quit", command=self.quit_gui)
        self.quit_button.pack(side=tk.RIGHT, padx=5)

        # Apply theme
        self.apply_theme()

        # Initial status update
        self.update_status()

        # Redirect input
        import builtins
        builtins.input = self.gui_input

    def update_status(self):
        if hasattr(self, 'day_label'):  # Only if UI is set up
            self.day_label.config(text=str(self.game.day))
            self.tick_label.config(text=str(self.game.tick_number))
            self.cash_label.config(text=f"${self.game.portfolio.cash:.2f}")
            self.net_worth_label.config(text=f"${self.game.portfolio.net_worth(self.game.market):.2f}")
            status = self.game.phone.get_status()
            self.happiness_bar['value'] = status['happiness']
            self.health_bar['value'] = status['health']
            self.business_bar['value'] = status['business']
            self.calls_label.config(text=str(status['pending_calls']))

            # Update market tab
            fg = 'lime' if self.dark_mode else 'black'
            self.market_text.config(foreground=fg)
            self.portfolio_text.config(foreground=fg)
            self.news_text.config(foreground=fg)
            self.market_text.config(state=tk.NORMAL)# Update market tab
            self.market_text.delete(1.0, tk.END)
            self.market_text.insert(tk.END, "All Stocks:\n\n")
            # Sort by price change descending
            sorted_stocks = sorted(self.game.market.stocks.items(), key=lambda x: (x[1]["price"] - (x[1]["history"][-2] if len(x[1]["history"]) > 1 else x[1]["price"])), reverse=True)
            for ticker, stock in sorted_stocks:
                owned = self.game.portfolio.holdings.get(ticker, 0)
                prev = stock["history"][-2] if len(stock["history"]) > 1 else stock["price"]
                change = stock["price"] - prev
                symbol = "▲" if change > 0 else "▼" if change < 0 else "→"
                self.market_text.insert(tk.END, f"{ticker:5} | ${stock['price']:>7.2f} {symbol} | {stock['name']:<20} | {stock['sector']:<12} | Owned: {owned}\n")
            self.market_text.config(state=tk.DISABLED)

            # Update portfolio tab
            self.portfolio_text.config(state=tk.NORMAL)
            self.portfolio_text.delete(1.0, tk.END)
            self.portfolio_text.insert(tk.END, "Portfolio Summary:\n\n")
            phone_status = self.game.phone.get_status()
            total_value = 0
            holdings_count = 0
            total_pnl = 0
            for ticker, amt in self.game.portfolio.holdings.items():
                if amt > 0:
                    stock = self.game.market.stocks[ticker]
                    value = amt * stock["price"]
                    cost = self.game.portfolio.cost_basis[ticker]
                    pnl = value - cost
                    total_value += value
                    total_pnl += pnl
                    holdings_count += 1
                    sector = stock["sector"]
                    pct_portfolio = (value / self.game.portfolio.net_worth(self.game.market)) * 100 if self.game.portfolio.net_worth(self.game.market) > 0 else 0
                    self.portfolio_text.insert(tk.END, f"{ticker}: {amt} shares @ ${stock['price']:.2f} = ${value:.2f} (Cost: ${cost:.2f}, P/L: ${pnl:+.2f}) ({sector}, {pct_portfolio:.1f}% of portfolio)\n")
            net_worth = self.game.portfolio.net_worth(self.game.market)
            cash_pct = (self.game.portfolio.cash / net_worth) * 100 if net_worth > 0 else 0
            holdings_pct = (total_value / net_worth) * 100 if net_worth > 0 else 0
            self.portfolio_text.insert(tk.END, f"\nTotal Holdings Value: ${total_value:.2f} ({holdings_pct:.1f}% of net worth)\n")
            self.portfolio_text.insert(tk.END, f"Total Unrealized P/L: ${total_pnl:+.2f}\n")
            self.portfolio_text.insert(tk.END, f"Cash: ${self.game.portfolio.cash:.2f} ({cash_pct:.1f}% of net worth)\n")
            self.portfolio_text.insert(tk.END, f"Net Worth: ${net_worth:.2f}\n")
            self.portfolio_text.insert(tk.END, f"Stocks Held: {holdings_count}\n")
            self.portfolio_text.insert(tk.END, f"Happiness: {phone_status['happiness']}% | Health: {phone_status['health']}% | Business: {phone_status['business']}% | Pending Calls: {phone_status['pending_calls']}\n")
            if self.game.phone.loan:
                self.portfolio_text.insert(tk.END, f"Loan: ${self.game.phone.loan['principal']:.2f} due on Day {self.game.phone.loan['due_day']}, total due ${self.game.phone.loan['total_due']:.2f}\n")
            self.portfolio_text.config(state=tk.DISABLED)

            # Update news tab
            self.news_text.config(state=tk.NORMAL)
            self.news_text.delete(1.0, tk.END)
            self.news_text.insert(tk.END, "Active News:\n\n")
            for effect in self.game.news.active_effects[:10]:  # Last 10
                self.news_text.insert(tk.END, f"{effect['text']} ({effect['duration']} ticks)\n")
            self.news_text.config(state=tk.DISABLED)

        if not self.updating:
            self.updating = True
            self.root.after(1000, self.update_status)  # Refresh every second

    def gui_input(self, prompt=""):
        # Print prompt to terminal
        if prompt:
            print(prompt, end='')
        return self.input_queue.get()

    def submit_command(self, event=None):
        cmd = self.entry.get().strip()
        if cmd:# Update market tab
            self.market_text.config(state=tk.NORMAL)
            self.entry.delete(0, tk.END)
            self.update_status()

    def do_buy(self):
        self.show_trade_dialog("buy")

    def do_sell(self):
        self.show_trade_dialog("sell")

    def show_trade_dialog(self, action):
        dialog = tk.Toplevel(self.root)
        dialog.title(f"{action.capitalize()} Stock")
        dialog.geometry("400x300")
        dialog.resizable(False, False)
        
        bg, fg = ('#1e1e1e', 'lime') if self.dark_mode else ('white', 'black')
        dialog.config(bg=bg)
        
        ticker_var = tk.StringVar()
        ticker_combo = ttk.Combobox(dialog, textvariable=ticker_var, values=list(self.game.market.stocks.keys()), state='readonly')
        ticker_combo.pack(pady=5)
        
        price_label = tk.Label(dialog, text="Price: $0.00", bg=bg, fg=fg)
        price_label.pack(pady=5)
        
        amount_var = tk.StringVar()
        amount_entry = ttk.Entry(dialog, textvariable=amount_var)
        amount_entry.pack(pady=5)
        
        max_label = tk.Label(dialog, text=f"Max {action}able: 0", bg=bg, fg=fg)
        max_label.pack(pady=5)
        
        def update_info(*args):
            ticker = ticker_var.get()
            if ticker in self.game.market.stocks:
                price = self.game.market.stocks[ticker]["price"]
                price_label.config(text=f"Price: ${price:.2f}")
                if action == "buy":
                    max_amt = int(self.game.portfolio.cash // price)
                    max_label.config(text=f"Max buyable: {max_amt}")
                else:
                    max_amt = self.game.portfolio.holdings.get(ticker, 0)
                    max_label.config(text=f"Max sellable: {max_amt}")
            else:
                price_label.config(text="Price: $0.00")
                max_label.config(text=f"Max {action}able: 0")
        
        ticker_var.trace("w", update_info)
        update_info()
        
        def confirm():
            ticker = ticker_var.get()
            try:
                amount = int(amount_var.get())
                if amount > 0 and ticker:
                    self.send_command(f"{action} {ticker} {amount}")
                    dialog.destroy()
            except ValueError:
                pass
        
        tk.Button(dialog, text="OK", command=confirm).pack(side=tk.LEFT, padx=20, pady=10)
        tk.Button(dialog, text="Cancel", command=dialog.destroy).pack(side=tk.RIGHT, padx=20, pady=10)

    def show_phone_menu(self):
        menu_win = tk.Toplevel(self.root)
        menu_win.title("Phone Contacts")
        menu_win.geometry("400x300")
        tk.Label(menu_win, text="Select Contact:").pack(pady=10)
        for name, info in self.game.phone.contacts.items():
            if "outgoing_action" in info:
                btn = tk.Button(menu_win, text=f"{info['name']}: {info['description']}", wraplength=350, command=lambda n=name, w=menu_win: self.call_contact(n, w))
                btn.pack(pady=2)

    def call_contact(self, contact, win):
        win.destroy()
        self.send_command(f"call {contact}")

    def send_command(self, cmd):
        if cmd == "save":
            if messagebox.askyesno("Confirm", "Save game?"):
                self.input_queue.put(cmd)
        elif cmd == "exit":
            if messagebox.askyesno("Confirm", "Exit game?"):
                self.input_queue.put(cmd)
        elif cmd == "buy_stock":
            self.do_buy()
        elif cmd == "sell_stock":
            self.do_sell()
        elif cmd == "phone":
            self.show_phone_menu()
        else:
            self.input_queue.put(cmd)
        self.update_status()

    def quit_gui(self):
        self.root.destroy()
        import sys
        sys.exit(0)

    def handle_sigint(self, sig, frame):
        self.root.destroy()
        import sys
        sys.exit(0)

    def run(self):
        threading.Thread(target=self.game.run, daemon=True).start()
        self.root.mainloop()

if __name__ == "__main__":
    import sys
    game = Game()
    if len(sys.argv) > 1 and sys.argv[1] == "--gui":
        import tkinter as tk
        from tkinter import ttk, simpledialog
        import tkinter.messagebox as messagebox
        import queue
        import threading
        gui = GUIGame(game)
        gui.run()
    else:
        game.run()