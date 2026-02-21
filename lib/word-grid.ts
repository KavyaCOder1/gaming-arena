/**
 * lib/word-grid.ts
 *
 * Server-side grid builder + validator.
 * The server generates the grid, stores it in DB, and validates
 * every word the client claims to have found.
 */

type Cell       = string;          // single uppercase letter
type Coord      = [number, number]; // [row, col]
type Direction  = { dr: number; dc: number };

export interface PlacedWord {
  word:  string;
  cells: Coord[];  // ordered from first → last letter
}

export interface GeneratedGrid {
  grid:   Cell[][];     // gridSize × gridSize
  placed: PlacedWord[];
}

// Directions available per difficulty
const DIRECTIONS: Record<string, Direction[]> = {
  EASY:   [{ dr:0,dc:1 },{ dr:1,dc:0 }],
  MEDIUM: [{ dr:0,dc:1 },{ dr:1,dc:0 },{ dr:0,dc:-1 },{ dr:-1,dc:0 },{ dr:1,dc:1 }],
  HARD:   [
    { dr:0,dc:1 },{ dr:1,dc:0 },{ dr:0,dc:-1 },{ dr:-1,dc:0 },
    { dr:1,dc:1 },{ dr:-1,dc:-1 },{ dr:1,dc:-1 },{ dr:-1,dc:1 },
  ],
};

const FILLER = "EARTSNIOLDMCHGPUFBWYKXQZJV";

export function buildGrid(
  difficulty: string,
  gridSize: number,
  words: string[],
): GeneratedGrid {
  const dirs  = DIRECTIONS[difficulty] ?? DIRECTIONS.HARD;
  const grid  = Array.from({ length: gridSize }, () => Array(gridSize).fill("") as string[]);
  const placed: PlacedWord[] = [];

  for (const word of words) {
    let ok = false;
    for (let attempt = 0; attempt < 300 && !ok; attempt++) {
      const dir  = dirs[Math.floor(Math.random() * dirs.length)];
      const r    = Math.floor(Math.random() * gridSize);
      const c    = Math.floor(Math.random() * gridSize);
      const cells: Coord[] = [];
      let valid = true;

      for (let i = 0; i < word.length; i++) {
        const nr = r + dir.dr * i;
        const nc = c + dir.dc * i;
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) { valid = false; break; }
        if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i])       { valid = false; break; }
        cells.push([nr, nc]);
      }

      if (valid) {
        cells.forEach(([nr, nc], i) => { grid[nr][nc] = word[i]; });
        placed.push({ word, cells });
        ok = true;
      }
    }
    // If word couldn't be placed after 300 tries, skip it gracefully
  }

  // Fill empty cells with filler letters
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (grid[r][c] === "")
        grid[r][c] = FILLER[Math.floor(Math.random() * FILLER.length)];

  return { grid, placed };
}

/**
 * Validate that the cells the client sent for a word match the server's record.
 * Returns the matched word if valid, null otherwise.
 */
export function validateWordClaim(
  claimedWord: string,
  claimedCells: Coord[],
  placed: PlacedWord[],
  alreadyFound: Set<string>,
): PlacedWord | null {
  for (const pw of placed) {
    if (alreadyFound.has(pw.word)) continue;
    if (pw.word !== claimedWord)   continue;

    // Check forward match
    const fwd = claimedCells.map(([r, c]) => `${r},${c}`).join("|");
    const exp = pw.cells.map(([r, c]) => `${r},${c}`).join("|");
    const rev = [...pw.cells].reverse().map(([r, c]) => `${r},${c}`).join("|");

    if (fwd === exp || fwd === rev) return pw;
  }
  return null;
}
