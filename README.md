# ATM Challenge – ScreenCloud

This project is a solution to the ScreenCloud Solutions Engineer ATM challenge.

The goal was to build an ATM application that:
- authenticates a user via PIN
- displays a running balance
- supports withdrawals with limited note inventory
- handles overdraft constraints
- and maintains consistent behavior across multiple transactions

In addition to correctness, I focused on creating a user experience that feels like a real ATM rather than a basic web form.

---

## Live Demo

👉 https://screencloudatmchallenge.lovable.app/

A deployed, interactive version of the ATM application is available above.  
This reflects the final UX, transaction flow, and state handling described in this repository and Loom walkthrough.

---

## Key Features

- **Secure PIN authentication** (4-digit numeric, fully controlled input)
- **Dynamic withdrawal system** with custom amount entry
- **Context-aware suggested amounts** based on balance and dispensable notes
- **Deterministic note dispensing logic** with limited £5 / £10 / £20 inventory
- **Overdraft support** (up to -£100) with clear validation
- **Smooth transaction flow** including processing and completion states
- **Clean transaction history tracking**
- **Polished UI interactions** with subtle motion and feedback

---

## Technical Approach

The application separates **ATM domain logic** from the UI layer:

- The domain layer handles:
  - note selection
  - withdrawal validation
  - inventory updates
  - sequence behavior
  - suggestion generation

- The UI layer:
  - manages user interaction
  - displays structured results from the domain layer
  - focuses on clarity and experience

### Note Dispensing Logic

The system uses a deterministic approach to:
- find valid note combinations
- respect limited inventory
- prefer balanced distributions where possible
- ensure consistent outcomes as notes are depleted

---

## Testing

Unit tests were written for the ATM domain logic, including:

- note combination selection
- withdrawal success and failure cases
- overdraft boundary behavior
- **all permutations of required withdrawals (£140, £50, £90)**
- **denomination depletion scenarios**
- consistent result shape validation

Testing focuses on the domain layer to ensure reliability independent of the UI.

---

## AI & Tooling

This project was built using a structured AI-assisted workflow:

- **ChatGPT** – planning, architecture, UX decisions, and problem-solving
- **Lovable** – rapid UI development and iteration
- **Codex** – targeted implementation of logic, tests, and refactors
- **GitHub** – version control, PR management, and final source of truth

AI tools were used to accelerate development, while maintaining control over product decisions, architecture, and implementation quality.

---

## Running the Project

```bash
npm install
npm run dev
<img width="1957" height="15100" alt="ScreenCloud ATM Canvas" src="https://github.com/user-attachments/assets/834c1270-573c-4356-8a93-9334d4abfdc5" />
