// deterministic rng — same seed always produces the same tree shape.
// ported verbatim from design/memoir-field.js so seed values stay stable
// when migrating data over.
//
// hashStr: fnv-1a 32-bit. used to derive a tree's seed from its name.
// mulberry32: small fast prng seeded by a uint32. used to make all the
// stochastic choices in the tree mesh generator.

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
