# SmartWatch

SmartWatch is a smart market watchlist that helps users quickly understand what has meaningfully changed since they last checked.

Instead of only displaying stock prices, SmartWatch remembers the user's previous visit, compares the market when they return, highlights meaningful movements, and surfaces unusual activity using relationships between assets.

## 100-Word Pitch

SmartWatch is a market watchlist designed to answer not only “what is happening?” but “what meaningfully changed since I last checked?” Users create personalized watchlists and see current prices, news, and market movements. When they return, SmartWatch compares the latest state with their previous visit and highlights significant changes. Its key feature is relationship-based anomaly detection: using historical price correlations and market context, it identifies when an asset moves unusually compared with assets it normally moves with. We deliberately chose an explainable, evidence-based approach rather than price prediction. The result is a lightweight market-awareness tool that helps users focus attention without pretending to predict the future.

## Problem

Market dashboards often show large amounts of information, but users still have to figure out what actually changed since their previous visit.

SmartWatch focuses on a simpler question:

> **What changed, is it unusual, and why should I care?**

## Key Features

### 1. Personalized Watchlist

- Add stocks to a personal watchlist.
- Remove stocks when they are no longer relevant.
- Watchlist data is stored using Supabase.

### 2. Since Last Visit

SmartWatch remembers the user's previous session.

When the user returns, the dashboard shows:

- Previous price
- Current price
- Percentage movement
- Price difference
- Time since the previous visit
- Meaningful changes

This creates the core product loop:

**WATCH → LEAVE → RETURN → DETECT → EXPLAIN**

### 3. Holdings & Portfolio Context

Users can record:

- Buy price
- Quantity

SmartWatch then provides contextual information such as:

- Estimated profit/loss
- Current portfolio value

This helps users understand why a movement may matter to them personally.

### 4. Unusual Activity

SmartWatch looks beyond simple price movement by comparing an asset with assets it historically moves with.

For example, in the IT sector:

- TCS ↔ Infosys: historical correlation 0.84
- TCS ↔ Wipro: historical correlation 0.79
- TCS ↔ NIFTY IT: historical correlation 0.88

If TCS suddenly falls significantly while Infosys, Wipro, and the NIFTY IT index remain relatively stable, SmartWatch can flag the movement as unusual.

Example:

```text
TCS        -5.2%   ← significant move
Infosys    +2.1%
Wipro      +0.4%
NIFTY IT   +1.0%

TCS is moving differently from its historically related IT assets.
→ Unusual Activity detected
### 5. Latest Market News

The dashboard retrieves current market-related news through a server-side news API route.

Users can:

- See the latest headlines
- Open an article
- Expand the news section to view more stories

### 6. Explainable Signals

SmartWatch is designed as a market-awareness tool, not a trading prediction system.

It focuses on:

- Observation
- Context
- Comparison
- Historical relationships
- Anomaly detection

It does **not** attempt to predict future stock prices.

## Dashboard

The dashboard is intentionally lightweight and organized around attention:

1. **What Changed While You Were Away**
2. **My Watchlist**
3. **Unusual Activity**
4. **Latest News**

The interface uses a dark futuristic fintech design with subtle blue electronic-style borders and green/red market signals.

## Technology Stack

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Supabase**
  - Authentication
  - PostgreSQL database
  - Row Level Security
- **NewsAPI**
- Client-side market simulation for the hackathon demo

## Architecture

```text
                         USER
                           |
                           v
                +---------------------+
                |      NEXT.JS        |
                | React + TypeScript  |
                | Tailwind CSS        |
                +----------+----------+
                           |
                           v
                +---------------------+
                |    Next.js API      |
                +----+-----------+----+
                     |           |
                     v           v
              +----------+   +----------+
              | Supabase |   | News API |
              | Auth + DB|   |          |
              +----------+   +----------+
                     |
                     v
             +-------------------+
             | SmartWatch Engine |
             +-------------------+
             | Last-visit diff   |
             | Price movement    |
             | Volume context    |
             | Correlation       |
             | Divergence        |
             | News signals      |
             +---------+---------+
                       |
                       v
                 DASHBOARD