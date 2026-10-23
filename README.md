# 🧠 Brainiac FunZone

Fast, short brain games for a curious 5th grader: **maps and flags, chess puzzles and games against the computer, soccer trivia, and wild facts**. You earn XP, levels, badges, and daily streaks.

**Play:** https://nancivelascoo-del.github.io/genius-stadium/ (on iPad: Safari → Share → Add to Home Screen; it works offline. If you added the old "Genius Stadium" shortcut, delete it and add it again to get the new FunZone name and icon.)

Every mode has four levels you pick before you play: **Easy, Medium, Hard, Expert**. Harder levels use tougher questions and shorter timers, and give fewer hints. After every round a **Review** screen shows each question with ✓ or ✗, your answer, and the right one. One button replays just the ones you missed.

- 🌍 **Geo Arena:** tap countries or US states on the map against the clock, plus Flag Frenzy, Capital Clash, State Capitals, and Explore. Expert uses rare countries, look-alike flags, and reverse questions. On the map you get one try and no flag clue. The review map lights up the places you missed.
- ♟️ **Chess Lab** (modes inspired by Chess.com, with our own names and art):
  - ⚡ **Puzzle Blitz:** solve as many as you can in 3 or 5 minutes. The puzzles get harder as you go, and 3 strikes and you're out. You can also start on hard puzzles.
  - 📈 **Rated Puzzles:** a puzzle rating that starts at 800 and goes up or down after every puzzle (Elo-style).
  - 🌐 **Daily Puzzle:** when online, today's free puzzle from Chess.com's public API, credited with a link. Offline, it's our own puzzle of the day.
  - 🪜 **Puzzle Ladder:** five tiers, from Mate in 1 up to Master (mate in 3, only-move defense, pawn endgames), plus a 🚀 skip-ahead test and Pro lessons.
- 🤖 **Play the Bots:** six chess bots with ratings from 400 to 2000 (Chick Pea 400, Turbo Turtle 700, Foxy Fork 1000, Professor Hoot 1350, Blaze the Dragon 1700, Grandmaster Bolt 2000). Play White or Black. Legal moves light up, and the easier bots allow undo and hints. Wins, draws and losses are saved for each bot.
- 🌐 **Chess.com ratings (optional, off by default):** type a Chess.com username to see that account's public ratings. Nothing is sent until you turn it on and tap the button, and no username is built in.
- ⚽ **Soccer Stadium:** a penalty shootout where right answers let you shoot, plus soccer trivia. On higher levels the keeper gets quicker, so you have to answer fast to score.
- 💡 **Fact Lab:** Fact of the Day, a Fact or Fib blitz, a Quick Quiz, and a Fact Vault to fill. Every answer comes with a "why".
- 📅 **Daily Challenge:** 5 mixed questions plus a puzzle of the day, in Normal or Hard.

There are no accounts, no ads, and no tracking. Progress is saved on the device. The app loads nothing from other websites, except Chess.com's public API, and only when you open the Daily Puzzle or the optional ratings card while online.

## How the computer opponent works

The game includes Stockfish, one of the strongest chess engines in the world, built for the web (WebAssembly). It runs in a background worker on the iPad, so the screen stays smooth while it thinks.

For each move, Stockfish looks ahead through thousands of possible moves and picks the best one. Each bot plays at its own strength. The three strongest (1350, 1700 and 2000) use Stockfish's built-in rating limiter (`UCI_Elo`). The easier ones use a low "skill level" and only look a few moves ahead, and the two easiest sometimes pick a random move on purpose. The ratings are rough guides, not official Chess.com ratings.

The engine is cached on the first visit, so it works offline. If a device can't run it, a small built-in engine plays instead.

## Credits

- Map shapes: [Natural Earth](https://www.naturalearthdata.com/) (public domain), via `world-atlas` and `us-atlas`.
- Flags: [flag-icons](https://github.com/lipis/flag-icons) (MIT), see `flags/LICENSE.txt`.
- Chess rules: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2), see `js/chess.js.LICENSE.txt`.
- Chess engine: [Stockfish.js](https://github.com/nmrugg/stockfish.js) 18 lite (GPLv3), unmodified, in `engine/`. The license is in `engine/COPYING.txt`. Source: https://github.com/nmrugg/stockfish.js and https://github.com/official-stockfish/Stockfish
- Chess pieces: traced from the DejaVu Sans font (free license).
- Fonts: [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) (SIL Open Font License) and [Permanent Marker](https://fonts.google.com/specimen/Permanent+Marker) (Apache 2.0), bundled in `fonts/` with their licenses.
- Chess.com: the Daily Puzzle and the optional ratings come from the [Chess.com Published-Data API](https://www.chess.com/news/view/published-data-api). Puzzle Blitz, rated puzzles and the bots are inspired by Chess.com. FunZone is not affiliated with Chess.com and uses no Chess.com logos or art.
- Puzzles were generated for this game. Every puzzle was checked with the Stockfish engine: each mate has exactly one winning first move, and pawn endgames were checked with an exact solver.

Testing: see [TESTING.md](TESTING.md).
