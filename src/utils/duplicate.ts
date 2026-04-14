export function duplicateElements(elements: any[], store: any) {
  const newIds: string[] = [];
  elements.forEach((el) => {
    if (el.removable === false) return;
    const clone = el.clone();
    if (el.type === 'group') {
      clone.children.forEach((child: any) => {
        child.set({ x: child.x + 50, y: child.y + 50 });
      });
    } else {
      clone.set({ x: el.x + 50, y: el.y + 50 });
    }
    newIds.push(clone.id);
  });
  store.selectElements(newIds);
}
