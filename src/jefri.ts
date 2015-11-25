export function EntityComparator(a: JEFRi.Entity, b: JEFRi.Entity): boolean {
  return a && b && a._type() === b._type() && a.id() === b.id();
}

export function isEntity(obj: any): boolean {
  // Duck type check if an object is an entity.
  return typeof obj._type == "function" && typeof obj.id == "function" || false;
}
