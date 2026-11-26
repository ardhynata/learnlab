// The seed every lab that shows "the course dataset" starts from. The k-NN, k-means and (from wave A on)
// regression labs all call makeDataset(name, SHARED_SEED), so a learner sees the same points in each and
// can compare how classification uses the labels and clustering ignores them.
export const SHARED_SEED = 520;

const clamp = value => Math.max(0, Math.min(10, value));

export function makeDataset(name, seed = 520, count = 48) {
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }
  function noise() {
    return (random() + random() + random() - 1.5) * 2;
  }
  return Array.from({ length: count }, (_, index) => {
    const label = index % 2 === 0 ? 'A' : 'B';
    let x, y;
    if (name === 'rings') {
      const angle = index * 2.39996;
      const radius = (label === 'A' ? 1.7 : 3.8) + noise() * .27;
      x = 5 + Math.cos(angle) * radius;
      y = 5 + Math.sin(angle) * radius;
    } else if (name === 'checker') {
      const right = Math.floor(index / 2) % 2 === 0;
      const high = right === (label === 'A');
      x = (right ? 5.5 : .5) + random() * 4;
      y = (high ? 5.5 : .5) + random() * 4;
    } else {
      x = (label === 'A' ? 3.5 : 6.5) + noise() * 1.25;
      y = (label === 'A' ? 5.9 : 4.1) + noise() * 1.25;
    }
    return { x: clamp(x), y: clamp(y), label, index };
  });
}
