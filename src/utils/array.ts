export const intersect = <T>(a: T[], b: T[]): T[] => {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
};

export const flat = <T>(arr: T | T[]): T[] => {
  if (!Array.isArray(arr)) return arr as any;
  return arr.reduce((acc: T[], val: T) => acc.concat(val), []);
};
