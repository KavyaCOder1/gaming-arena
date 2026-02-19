# 🎮 Word Search Game -- Complete Configuration Document

## 📌 Project Overview

This document defines the full gameplay configuration for the Word
Search mini-game. The goal is to provide a balanced, mobile-friendly,
and scalable difficulty system suitable for Telegram Mini Apps and web
platforms.

------------------------------------------------------------------------

# 🟢 Easy Mode

## Grid Configuration

-   Grid Size: **6 x 6**
-   Total Cells: 36

## Words Configuration

-   Words to Find: **5 words**
-   Word Length: 3--5 letters
-   Difficulty: Beginner

## Allowed Directions

-   Horizontal (Left → Right)
-   Vertical (Top ↓ Bottom)

No backward words. No diagonal words.

## Gameplay Characteristics

-   Fast completion (1--2 minutes)
-   Minimal overlap
-   Clear word visibility
-   Ideal for new players

------------------------------------------------------------------------

# 🟡 Medium Mode

## Grid Configuration

-   Grid Size: **9 x 9**
-   Total Cells: 81

## Words Configuration

-   Words to Find: **7 words**
-   Word Length: 4--7 letters
-   Difficulty: Balanced

## Allowed Directions

-   Horizontal (Both directions)
-   Vertical (Both directions)
-   One diagonal direction

## Gameplay Characteristics

-   Moderate scanning difficulty
-   Medium overlap (30--40%)
-   More filler letters for distraction
-   Average completion time: 3--5 minutes

------------------------------------------------------------------------

# 🔴 Hard Mode

## Grid Configuration

-   Grid Size: **11 x 11**
-   Total Cells: 121

## Words Configuration

-   Words to Find: **9 words**
-   Word Length: 5--9 letters
-   Difficulty: Advanced

## Allowed Directions

-   Horizontal (Both directions)
-   Vertical (Both directions)
-   Diagonal (Both directions)

## Gameplay Characteristics

-   High distraction density
-   High overlap (50--60%)
-   Strategic word placement
-   Competitive gameplay ready
-   Average completion time: 5--8 minutes

------------------------------------------------------------------------

# 🧠 Word Placement Logic

## Overlap Rules

-   Easy: Max 1 letter overlap per word
-   Medium: 30--40% overlap allowed
-   Hard: 50--60% overlap allowed

## Filler Letters

-   Use high-frequency English letters (E, A, R, T, S, N)
-   Avoid obvious patterns
-   Randomized distribution

------------------------------------------------------------------------

# 🎯 Difficulty Scaling Strategy

  Mode     Grid Size   Words   Avg Time   Overlap
  -------- ----------- ------- ---------- ---------
  Easy     6x6         5       1--2 min   Low
  Medium   9x9         7       3--5 min   Medium
  Hard     11x11       9       5--8 min   High

------------------------------------------------------------------------

# 🏆 Reward Suggestion (Optional)

  Mode     Reward Multiplier
  -------- -------------------
  Easy     1x
  Medium   1.8x
  Hard     3x

------------------------------------------------------------------------

# 🚀 Optimization Notes

-   Keep cell size responsive for mobile.
-   Maintain minimum 36px--42px touch targets.
-   Animate word discovery for better UX.
-   Add timer-based anti-cheat detection for competitive modes.
-   Track solve time for leaderboard ranking.

------------------------------------------------------------------------

# ✅ Final Recommended Setup

-   Easy → 6x6 (5 words)
-   Medium → 9x9 (7 words)
-   Hard → 11x11 (9 words)

This configuration ensures: ✔ Clean UI\
✔ Balanced difficulty\
✔ Mobile optimization\
✔ Competitive scalability

------------------------------------------------------------------------

End of Document
