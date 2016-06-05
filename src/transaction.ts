import {EventEmitter} from 'events';

import {
  StoreExecutionType,
} from './enums';

import {
  AnyEntity,
  BareEntity,
  Entity,
  EntitySpec,
  IStore,
  ITransaction,
  JEFRiAttributes,
  Properties,
  TransactionSpec,
} from './interfaces';


export class Transaction<T extends AnyEntity | EntitySpec> extends EventEmitter
    implements ITransaction<T> {
  public attributes: Properties = {};
  public entities: T[] = [];

  constructor(spec: TransactionSpec<T> = {}, public store: IStore = null) {
    super();
    this.attributes = spec.attributes || {};
    this.add(spec.entities || []);
  }

  encode(): {attributes: Properties, entities: T[]} {
    let transaction = {attributes: this.attributes, entities:<T[]>[]};

    for (let entity of this.entities) {
      if (typeof (entity as any)._encode === 'function') {
        transaction.entities.push(<T>(entity as any)._encode());
      } else {
        transaction.entities.push(entity);
      }
    }
    return transaction;
  }

  toString(): string { return JSON.stringify(this.encode()); }

  get(store: IStore = this.store): Promise<ITransaction<Entity>> {
    this.emit('getting');
    return store.execute(StoreExecutionType.get, this);
  }

  persist(store: IStore = this.store): Promise<Transaction<Entity>> {
    this.emit('persisting');
    return store.execute(StoreExecutionType.persist, this)
        .then((t: Transaction<Entity>) => {
          for (let entity of t.entities) {
            (<Entity>entity)._events.emit('persisted');
          }
          return t;
        });
  }

  add(entities: T[]): Transaction<T> {
    this.entities = this.entities.concat(entities);
    return this;
  }

  setAttributes(attrs: Properties): Transaction<T> {
    Object.assign(this.attributes, attrs);
    return this;
  }
}
