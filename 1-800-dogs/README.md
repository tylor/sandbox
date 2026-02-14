# 1-800-DOGS

Your Premier Full-Service Dog Agency — Twilio IVR Phone Tree

## What Is This?

A Twilio-powered IVR (Interactive Voice Response) application that simulates calling a full-service dog agency. Callers navigate an extensive phone tree covering everything from dog adoption to birthday party planning. When they finally reach an "agent," it's just dogs barking.

## Phone Tree

```
1-800-DOGS Main Menu
├── 1: Hours & Location
│   ├── 1: Holiday Hours
│   └── 2: Directions from Nearest Dog Park
├── 2: Dog Status Checker
│   └── Enter 4-digit Dog ID → Status Report
│       ├── 1: Check Another Dog
│       └── 2: Request Belly Rub (3-5 business days)
├── 3: Adoption Services
│   ├── 1: Available Breeds
│   ├── 2: Adoption Requirements
│   └── 3: Dog Compatibility Quiz (2 questions)
├── 4: Training Academy
│   ├── 1: Basic Obedience
│   ├── 2: Advanced Training
│   └── 3: Behavioral Correction
├── 5: Report a Lost Dog
│   ├── 1: Escaped Through Front Door
│   ├── 2: Dug Under Fence
│   ├── 3: Figured Out Door Handle
│   └── 4: Interdimensional Travel
├── 6: Birthday Party Planning
│   ├── 1: Basic Barkday ($49.99)
│   ├── 2: Deluxe Pawty ($149.99)
│   └── 3: Ultimate Good Boy Gala ($2,000+, includes yacht)
├── 7: Bark-to-English Translation
│   ├── 1: Single Bark Translation
│   ├── 2: Multiple Bark Analysis
│   └── 3: Bark Phrase Book
├── 8: Billing & Payments
│   ├── 1: Check Balance (in bones)
│   ├── 2: Make Payment
│   └── 3: Dispute a Charge
├── 9: Speak to a Dog Agent
│   └── Hold → Fun Facts → "Agent Barksworth" (barking)
└── 0: Repeat Menu
```

## Setup

### Prerequisites

- Node.js 18+
- A [Twilio](https://www.twilio.com/) account with a phone number
- [ngrok](https://ngrok.com/) or similar tunnel for local development

### Install & Run

```bash
cd 1-800-dogs
npm install
npm start
```

The server starts on port 3000 (or set `PORT` env var).

### Connect to Twilio

1. Start the server: `npm start`
2. Expose it publicly (for local dev):
   ```bash
   ngrok http 3000
   ```
3. In your Twilio console, configure your phone number's **Voice webhook** to:
   ```
   https://your-ngrok-url.ngrok.io/voice (HTTP POST)
   ```
4. Call your Twilio number and enjoy.

### Deploy

This is a standard Express app. Deploy to any Node.js host (Railway, Render, Fly.io, Heroku, etc.) and set the webhook URL accordingly.

## How It Works

- Built with Express and the Twilio Node.js SDK
- Each menu option is a POST route that returns TwiML (Twilio Markup Language)
- `<Gather>` collects DTMF keypad input and routes to sub-menus
- `<Say>` uses Amazon Polly (Joanna) for text-to-speech
- `<Play>` plays barking audio from Wikimedia Commons
- The "agent" is just barking sounds with narration

## Highlights

- **Dog Status Checker**: Enter any 4-digit ID for a deterministic but randomized status
- **Compatibility Quiz**: Two questions, same result every time (you're compatible with a dog)
- **Hold Experience**: Higher-than-normal dog volume warnings, fun facts, loyalty bones
- **Agent Barksworth**: Your dedicated dog agent who resolves all issues via barking
