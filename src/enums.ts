/**
 * JEFRi Enumerations.
 */
export enum JEFRiPropertyType {
  int,
  float,
  string,
  list,
  object,
  boolean
}

export enum EntityStatus {
  NEW,
  PERSISTED,
  MODIFIED
}

export enum EntityRelationshipType {
  is_a,
  has_a,
  has_many
}

export enum StoreExecutionType {
  get,
  persist
}
