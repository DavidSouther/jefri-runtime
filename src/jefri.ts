import {EventEmitter} from 'events';
import {Entity, EntityRelationship} from './interfaces';

/**
 * Entity collection utilities.
 */
export function EntityComparator(a: Entity, b: Entity): boolean {
  return a && b && a._type() === b._type() && a.id() === b.id();
}

export function isEntity(obj: any): boolean {
  // Duck type check if an object is an entity.
  return obj && typeof obj._type == "function" && typeof obj.id == "function" ||
         false;
}

/**
 * JEFRi-aware Array, which manages relationships.
 */
export class EntityArray<E extends Entity> extends Array<E> {
  constructor(private entity: Entity, private field: string,
              private relationship: EntityRelationship,
              public _events: NodeJS.EventEmitter = new EventEmitter()) {
    super()
  }

  static ADD = 'add';
  static REMOVE = 'remove';
  remove(entity: E): EntityArray<E> {
    if (entity === null) {
      return this;
    }
    let i = this.length - 1;
    while (i >= 0) {
      if (this[i]._equals(entity)) {
        if (this.relationship.back) {
          let e = this[i];
          try {
            e[this.relationship.back].remove(this);
          } catch (err) {
            e[this.relationship.back] = null;
          }
        }
        this.splice(i, 1);
      }
      i -= 1;
    }
    this._events.emit(EntityArray.REMOVE, entity);
    return this;
  }

  add(entity: E | E[]): EntityArray<E> {
    if (entity instanceof Array) {
      entity.map((e: E) => this.add(e));
    } else {
      let found = this.entity[this.field]
                      .filter((e: E) => EntityComparator(e, <E>entity))
                      .length > 0;
      if (!found) {
        this.push(<E>entity);
        if (this.relationship.back) {
          entity[this.relationship.back] = this.entity;
        }
        this._events.emit(EntityArray.ADD, entity);
      }
    }
    return this;
  }
}
