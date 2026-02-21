# DB Migration — Run These Commands

```bash
# 1. Drop old schema (WARNING: deletes all data)
psql -U botuser -h localhost -c "DROP DATABASE \"gaming-arena\";"
psql -U botuser -h localhost -c "CREATE DATABASE \"gaming-arena\";"

# 2. Push new schema + generate client
npx prisma db push
npx prisma generate

# 3. Restart
npm run dev
```

---

## Rank System (from ranks.zip)

| Rank    | XP Range       | Color   | Icon         | Perks                                    |
|---------|---------------|---------|--------------|------------------------------------------|
| ROOKIE  | 0 – 1,000     | #94a3b8 | deployed_code| Standard Matchmaking, Starter Pack       |
| VETERAN | 1,001 – 5,000 | #13b6ec | shield       | Priority Queuing, Veteran Badge Icon      |
| ELITE   | 5,001 – 15,000| #ff00ff | pentagon     | Tournament Access, Glitch Avatar Frame    |
| LEGEND  | 15,001+       | #fbbf24 | crown        | Pro Circuit Access, Legendary Skin Set    |

## XP Per Game

### Tic-Tac-Toe
| Result | Easy | Medium | Hard |
|--------|------|--------|------|
| WIN    | 50   | 120    | 250  |
| DRAW   | 15   | 40     | 80   |
| LOSE   | 5    | 12     | 25   |

### Word Search
| Result   | Easy | Medium | Hard |
|----------|------|--------|------|
| Complete | 80   | 180    | 350  |
| Per word | 10   | 25     | 50   |

## Leaderboard Fairness

Scores are stored **per-game per-difficulty** — so EASY, MEDIUM and HARD players never compete in the same bracket. Use the difficulty tab filter on the leaderboard page.

## Score Caps (server-side validation)

| Game       | Easy | Medium | Hard |
|------------|------|--------|------|
| TTT Win    | 100  | 250    | 500  |
| TTT Draw   | 35   | 88     | 175  |
| WS Max     | 500  | 1260   | 2700 |

Any score outside these bounds is rejected by the API.
