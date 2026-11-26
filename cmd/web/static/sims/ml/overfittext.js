// Wording helpers for the overfit lab, kept language-free so they can be unit-tested: each returns
// an { en, id } pair of strings and the lab picks one with tr().

// The cap on the "typical miss" in grams. Above it the number is no longer informative (a wild
// high-degree fit), so the sentence says "more than the cap" instead of printing it.
export const MISS_CAP_GRAMS = 10000;

// The whole clause about how far off a validation penguin is, for a miss in grams. `format` turns a
// number into text for the current language (the lab passes fmt). The capped case gets its own
// clause: "about over 10,000 g" would contradict itself.
export function missClause(miss, format) {
  if (Number.isFinite(miss) && miss <= MISS_CAP_GRAMS) {
    const g = `${format(miss)} g`;
    return {
      en: `is typically off by about ${g}`,
      id: `rata-rata meleset sekitar ${g}`,
    };
  }
  const g = `${format(MISS_CAP_GRAMS)} g`;
  return {
    en: `is typically off by more than ${g}`,
    id: `rata-rata meleset lebih dari ${g}`,
  };
}
