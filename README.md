# Phase 10 Party

A premium, multiplayer web-based adaptation of the classic Phase 10 card game. 

## Objective
The goal of the game is to be the first person to complete all 10 phases. In the case of a tie (multiple players completing Phase 10 in the same round), the player with the lowest total score wins.

## The Phases
A "Set" is made of two or more cards with the same number. A "Run" is made of four or more numbered cards in consecutive order.

1. 2 sets of 3
2. 1 set of 3 and 1 run of 4
3. 1 set of 4 and 1 run of 4
4. 1 run of 7
5. 1 run of 8
6. 1 run of 9
7. 2 sets of 4
8. 7 cards of one color
9. 1 set of 5 and 1 set of 2
10. 1 set of 5 and 1 set of 3

## Gameplay Rules
1. **Dealing:** Every player is dealt 10 cards. The rest of the cards become the Draw Pile, and the top card is flipped to form the Discard Pile.
2. **Turn Flow:** On your turn, you must **Draw** a card (from either the Draw or Discard pile), optionally **Lay** down your phase, optionally **Hit** on laid phases, and finally **Discard** one card to end your turn.
3. **Hitting:** Once you have laid down your phase for the round, you may "hit" by adding valid cards from your hand to any phase already laid on the table (either yours or an opponent's).
4. **Ending the Round:** A round ends immediately when a player discards their last card (going out). All other players score penalty points for the cards left in their hands.

## Special Cards

### Wild Cards
- Can be used in place of any number or color to complete a phase.
- Once laid down, a Wild card cannot be moved or replaced.
- **Penalty:** 25 points if left in your hand at the end of a round.

### Skip Cards
Skip cards have specific, strict rules:
- **Usage:** A Skip card cannot be used to make a phase and cannot be picked up from the discard pile.
- **Targeting:** When you discard a Skip card, you may choose one opponent to lose their upcoming turn. 
- **No Stacking:** You cannot stack multiple skips onto a single player (a player can only have one skip pending against them at a time).
- **Initial Deal:** If a Skip card is the very first card flipped to start the discard pile, the first player to act automatically skips their first turn.
- **Penalty:** 15 points if left in your hand at the end of a round.

## Scoring
At the end of a round, any cards remaining in your hand count against you:
- **Cards 1-9:** 5 points each
- **Cards 10-12:** 10 points each
- **Skip Cards:** 15 points each
- **Wild Cards:** 25 points each

## Tech Stack
- Frontend: HTML, Vanilla CSS, JS (ES Modules)
- Backend: Node.js, Express
- Real-time synchronization: Native WebSockets (`ws`)
