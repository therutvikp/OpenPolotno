export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (
    typeof a === 'object' && a != null &&
    typeof b === 'object' && b != null
  ) {
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key in a) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};
