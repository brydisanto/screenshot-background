# screenshot-background

## What to Build
I'd like to build a tool where I can upload any screenshot and have it be auto formatted onto a beautiful overlay/border. Use this CLI styling as the background that it applies.

Make it interactive with different design elements that the user can adjust and play with. Xnapper is a good reference.

## Starting Point
This project uses the **A website or landing page** pattern. Here's what Claude should build first:

Build a landing page with: hero section with gold shimmer title, about section, features grid (3 columns), CTA section, footer with social links. Use the GVC brand system throughout.

## Selected Power-ups
- **Game starter kit** -- state machine, daily seed, save/resume, touch input, anti-cheat, share card

## GVC Brand System

### Colors
- **Gold (primary):** #FFE048
- **Black (background):** #050505
- **Dark (cards/panels):** #121212
- **Gray (borders/subtle):** #1F1F1F
- **Pink accent:** #FF6B9D
- **Orange accent:** #FF5F1F
- **Green (success):** #2EFF2E

### Typography
- **Headlines:** Brice font (display), bold/black weight -- make them feel premium
- **Body text:** Mundial font, clean and readable, generous spacing
- CSS variables: `--font-brice` for display, `--font-mundial` for body
- Tailwind: `font-display` for headlines, `font-body` for text

### Design Language
- Dark-first design (#050505 background)
- Gold accents (#FFE048) for CTAs, highlights, important elements
- Gold shimmer effect on key headlines (`.text-shimmer` class)
- Gold glow on hover for cards (`.card-glow` class)
- Floating ember particles for ambient effect (`.ember` class)
- Rounded corners (12-16px), soft shadows
- Generous whitespace -- let things breathe
- Micro-animations on hover/interaction (scale, glow, fade)
- Use Framer Motion for entry animations

### CSS Utilities
- `.text-shimmer` -- animated gold gradient text
- `.card-glow` -- gold glow box shadow with hover enhancement
- `.ember` -- floating gold particle dot
- `.rising-particle` -- gold particles that float up from the bottom
- `.font-display` -- Brice headline font
- `.font-body` -- Mundial body font
- Grid texture background and gold bottom gradient are already applied to body
- Shaka icon (/shaka.png) should wiggle on hover. It is already set as the site favicon.
- Site titles should be UPPERCASE (all caps)

## GVC API (no API key needed)
All GVC collection data is available from: https://api-hazel-pi-72.vercel.app/api
- GET /stats -- returns: { floorPrice, floorPriceUsd, volume24h, volume24hUsd, numOwners, totalSales, avgPrice, marketCap, marketCapUsd, totalVolume, totalVolumeUsd }
- GET /sales?limit=10 -- returns: [{ txHash, priceEth, priceUsd, paymentSymbol, imageUrl, timestamp }]
- GET /sales/history?limit=100 -- same shape as /sales, max 1000
- GET /activity -- 30-day buys/sells, accumulator leaderboard
- GET /vibestr -- VIBESTR token data
- GET /vibestr/history -- daily VIBESTR price snapshots
- GET /market-depth -- bid/offer depth, floor price, lowest listing
- GET /traders -- 30-day trade stats
- GET /wallet/[address] -- ENS name, Twitter handle for a wallet
- GET /mentions -- recent X/Twitter mentions
Do NOT use the OpenSea API directly. Use the GVC API above instead.

## Contracts & Tokens (only use these)
- **GVC NFT:** 0xB8Ea78fcaCEf50d41375E44E6814ebbA36Bb33c4 (ERC-721, 6969 tokens)
- **HighKey Moments:** 0x74fcb6eb2a2d02207b36e804d800687ce78d210c (ERC-1155)
- **VIBESTR Token:** 0xd0cC2b0eFb168bFe1f94a948D8df70FA10257196 (ERC-20, 18 decimals)
- **ETH** is the base currency for all GVC transactions
- ETH price: https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd
- VIBESTR price: https://api.dexscreener.com/latest/dex/tokens/0xd0cC2b0eFb168bFe1f94a948D8df70FA10257196
- Public RPC: https://ethereum-rpc.publicnode.com
Do NOT reference any other NFT collections, tokens, or contracts. This project is only about GVC.

## Code Patterns

### Game Starter Kit Pattern

Core primitives for a scored, shareable, resumable game. Everything below is decoupled so you can take only the pieces you need.

#### 1. State machine (`lib/gameEngine.ts`)

Keep game state out of React. A tiny reducer + custom hook gives you testable logic that won't get reshuffled by re-renders.

```ts
export type Phase = "waiting" | "playing" | "paused" | "ended";
export interface GameState {
  phase: Phase; score: number; moves: number; maxMoves: number;
  seed: string; board: number[][]; history: Move[];
}
export interface Move { at: number; kind: string; payload: unknown; }

export function initGame(seed: string, maxMoves = 30): GameState {
  return { phase: "waiting", score: 0, moves: 0, maxMoves, seed, board: makeBoard(seed), history: [] };
}
export function applyMove(state: GameState, move: Move): GameState {
  // pure function: validate, mutate a copy, return new state
}
```

Wrap with a `useGame()` hook that exposes `{state, start, move, pause, resume, end}` and dispatches through `applyMove`.

#### 2. Daily seed (`lib/daily-seed.ts`)

Wordle-style: everyone playing today gets the same starting board. Huge viral loop.

```ts
export function todaySeed(tz = "America/New_York"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // "2026-04-21"
}
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
```

Support `?seed=abc123` URL param so players can challenge friends with custom seeds.

#### 3. Save / resume

Persist `GameState` to `localStorage` on every change:

```ts
useEffect(() => {
  if (state.phase === "playing" || state.phase === "paused") {
    localStorage.setItem(`game-state-${projectName}`, JSON.stringify(state));
  } else if (state.phase === "ended") {
    localStorage.removeItem(`game-state-${projectName}`);
  }
}, [state]);
```

On mount, if there's a saved state, show a "Resume previous run?" card.

#### 4. Touch input

Unified input layer over keyboard + swipe. Don't rely on mouse-only.

```ts
export function useSwipe(handlers: { onLeft?(): void; onRight?(): void; onUp?(): void; onDown?(): void }) {
  useEffect(() => {
    let sx = 0, sy = 0;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) (dx > 0 ? handlers.onRight : handlers.onLeft)?.();
      else (dy > 0 ? handlers.onDown : handlers.onUp)?.();
    };
    window.addEventListener("touchstart", onStart);
    window.addEventListener("touchend", onEnd);
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [handlers]);
}
```

#### 5. Error boundary around the game surface

A crash in game logic shouldn't blank the whole app. Wrap `<GameBoard />` in a boundary that shows "Something broke — Restart" and logs to the console / analytics.

#### 6. Anti-cheat via move replay

When a score is submitted, send both the `seed` and the full `moves_json`. Server re-runs `applyMove` with the same seed and compares the final score. Reject mismatches. Pair with the rate-limit pattern in the `leaderboard` addon.

#### 7. Shareable OG score card (`app/api/og/score/route.tsx`)

Dynamic Next.js OG image via `ImageResponse`. When a score URL is shared on X/Farcaster, the link preview shows a branded card with the player's name + score.

```tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "Anonymous";
  const score = searchParams.get("score") ?? "0";
  return new ImageResponse(
    (<div style={{ width: 1200, height: 630, background: "#050505", color: "#FFE048", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 72 }}>
      <div style={{ fontSize: 32, opacity: 0.6 }}>GVC</div>
      <div>{name}</div>
      <div style={{ fontSize: 144 }}>{score}</div>
    </div>),
    { width: 1200, height: 630 }
  );
}
```

Then add the OG route as `<meta property="og:image" ... />` on the score page so links unfurl with the card.

#### 8. Debug overlay

Gate on `?debug=1`. Floats a panel showing phase/score/moves/FPS with an "Instant Win" button. Priceless for iteration.

#### 9. Responsive board

Wrap the game canvas in `aspect-square max-h-[min(80vh,90vw)] mx-auto`. Respect safe-area insets on notched phones with `padding-bottom: env(safe-area-inset-bottom)`.

## Example Prompts to Try
- "Add a team member grid with photos and role titles"
- "Create a timeline section showing GVC milestones"
- "Add a newsletter signup form at the bottom"
- "Wire up the game state machine, daily seed, and save/resume pattern from CLAUDE.md"
- "Make everything responsive and look great on mobile"
- "Add smooth page transitions with Framer Motion"

## Token Metadata (`public/gvc-metadata.json`)

Complete metadata for all 6,969 GVC tokens. Keyed by token ID (0-6968).

```ts
const metadata = await fetch('/gvc-metadata.json').then(r => r.json());

const token = metadata["142"];
// token.name    -> "Citizen of Vibetown #142"
// token.traits  -> { Type: "Robot", Face: "Laser Eyes", Hair: "Mohawk Gold", Body: "Hoodie Black", Background: "BG Mint" }
// token.image   -> "ipfs://QmY6JpwTYx6zZHgfJb3gPJRh1U897NX4RudtK5jhJ3sNDS/142.jpg"

// Trait types: Type, Face, Hair, Body, Background
// To display image: replace "ipfs://" with "https://ipfs.io/ipfs/"
```

Use cases: rarity checker, token lookup, trait filtering, collection search, trait-based galleries.

## Assets
- Fonts: /public/fonts/ (Brice for headlines, Mundial for body)
- Shaka icon: /public/shaka.png
- GVC logotype: /public/gvc-logotype.svg
- Background grid: /public/grid.svg (already applied via body::before in globals.css — do NOT add background-size or opacity overrides on top; the SVG ships with its own 10% white stroke, and extra opacity stacks to invisible)
- Token metadata: /public/gvc-metadata.json (all 6,969 tokens with traits + images)

## Brand Asset Library
Official GVC brand images (backgrounds, GIFs, characters, scenes, T-poses) hosted and available via API.
- Browse gallery: https://goodvibesclub.ai/library
- API: GET https://goodvibesclub.ai/api/brand (returns all assets)
- Filter by category: GET https://goodvibesclub.ai/api/brand?category=backgrounds
- Response shape: { assets: [{ id, filename, image_url, category }], categories: [...] }
- Use image_url values directly as src in <img> or next/image components

## Tech Stack
- Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion

## Important: Dev Server
The dev server is already running (the user started it before opening Claude Code). Do NOT run `npm run dev` -just edit the files and the browser will hot-reload automatically. If you need to install a new package, use `npm install <package>` and the dev server will pick it up.

## Project Structure
app/ -> Pages and layouts
components/ -> Reusable UI components
public/ -> Static assets
CLAUDE.md -> This file
README.md -> Human-readable docs
