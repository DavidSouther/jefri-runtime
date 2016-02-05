import {EventEmitter} from 'events';

import {
  StoreExecutionType,
} from './enums';

import {
  BareEntity,
  Entity,
  IStore,
  ITransaction,
  JEFRiAttributes,
  Properties,
  TransactionSpec,
} from './interfaces';

export type AnyEntity = Entity | BareEntity;

export class Transaction extends EventEmitter implements ITransaction {
  public attributes: Properties = {};
  public entities: AnyEntity[] = [];

  constructor(spec: TransactionSpec = {}, public store: IStore = null) {
    super();
    this.attributes = spec.attributes || {};
    this.add(spec.entities || []);
  }

  encode(): {attributes: Properties, entities: BareEntity[]} {
    let transaction = {attributes: this.attributes, entities:<BareEntity[]>[]};

    for (let entity in this.entities) {
      if (typeof entity._encode === 'function') {
        transaction.entities.push(entity._encode());
      } else {
        transaction.entities.push(entity);
      }
    }
    return transaction;
  }

  toString(): string { return JSON.stringify(this.encode()); }

  get(store: IStore = this.store): Promise<ITransaction> {
    this.emit('getting');
    return store.execute(StoreExecutionType.get, this)
        .then(() => Promise.resolve(this));
  }

  persist(store: IStore = this.store): Promise<Transaction> {
    this.emit('persisting');
    return store.execute(StoreExecutionType.persist, this)
        .then((t: Transaction) => {
          for (let entity in t.entities) {
            if ((<Entity>entity)._events) {
              (<Entity>entity)._events.emit('persisted');
            }
          }
          return Promise.resolve(this);
        });
  }

  add(entities: AnyEntity[]): Transaction {
    this.entities = this.entities.concat(entities);
    return this;
  }

  setAttributes(attrs: Properties): Transaction {
    Object.assign(this.attributes, attrs);
    return this;
  }
}
