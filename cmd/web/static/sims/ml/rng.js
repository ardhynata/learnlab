// Seeded random numbers, so every dataset and every lab run is reproducible.

// A small linear congruential generator. Returns a function giving floats in [0, 1).
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// Approximately standard-normal noise from four uniform draws (Irwin-Hall, rescaled).
export function gauss(random) {
  return (random() + random() + random() + random() - 2) * Math.sqrt(3);
}

// Fisher-Yates shuffle into a new array.
export function shuffle(items, random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
