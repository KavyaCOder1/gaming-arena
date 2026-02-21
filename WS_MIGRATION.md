# Word Search Backend — DB Migration

Run this to add the WordSearchSession table:

```bash
npx prisma migrate dev --name add_word_search_session
npx prisma generate
```

If you want to do it without a migration file (quick dev):
```bash
npx prisma db push
npx prisma generate
```

New table added: **WordSearchSession**
New files added:
- lib/words.txt          — word bank (200+ meaningful words, 3 tiers)
- lib/word-bank.ts       — reads words.txt, picks random words by difficulty
- lib/word-grid.ts       — server-side grid builder + word validator
- app/api/games/ws/start/route.ts    — POST: create session, return grid
- app/api/games/ws/validate/route.ts — POST: validate word claim per cell
- app/api/games/ws/finish/route.ts   — POST: save score, award XP on completion only
