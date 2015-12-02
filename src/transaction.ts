import { EventEmitter } from 'events';

export type AnyEntity = JEFRi.Entity | JEFRi.BareEntity;

export class Transaction extends EventEmitter implements JEFRi.Transaction {
  public attributes: JEFRi.Properties = {};
  public entities: AnyEntity[] = [];

  constructor(spec: JEFRi.TransactionSpec = {}, public store: JEFRi.Store = null) {
    super();
    this.attributes = spec.attributes || {};
    this.add(spec.entities || []);
  }

  encode(): {attributes: JEFRi.Properties, entities: JEFRi.BareEntity[]} {
    let transaction = {
      attributes: this.attributes,
      entities: <JEFRi.BareEntity[]>[]
    };

    for(let entity in this.entities) {
      if (typeof entity._encode === 'function') {
        transaction.entities.push(entity._encode());
      } else {
        transaction.entities.push(entity);
      }
    }
    return transaction;
  }

  toString(): string {
    return JSON.stringify(this.encode());
  }

  get(store: JEFRi.Store = this.store): Promise<Transaction> {
    this.emit('getting');
    return store.execute(JEFRi.StoreExecutionType.get, this)
        .then(() => Promise.resolve(this));
  }

  persist(store: JEFRi.Store = this.store): Promise<Transaction> {
    this.emit('persisting');
    return store.execute(JEFRi.StoreExecutionType.persist, this)
        .then((t: Transaction) => {
          for(let entity in t.entities) {
            if ((<JEFRi.Entity>entity)._events) {
              (<JEFRi.Entity>entity)._events.emit('persisted');
            }
          }
          return Promise.resolve(this);
        });
  }

  add(entities: AnyEntity[]): Transaction {
    this.entities = this.entities.concat(entities);
    return this;
  }

  setAttributes(attrs: JEFRi.Properties): Transaction {
    Object.assign(this.attributes, attrs);
    return this;
  }
}
