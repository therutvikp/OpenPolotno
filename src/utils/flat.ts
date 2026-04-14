export const flat = <T>(arr: T | T[]): T[] => {
  if (!Array.isArray(arr)) return arr as any;
  return arr.reduce((acc: T[], val: T) => acc.concat(val), []);
};
