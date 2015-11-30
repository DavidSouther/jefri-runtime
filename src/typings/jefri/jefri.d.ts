/// <reference path="../node/node.d.ts" />

declare module JEFRi {
  interface JEFRi {
    Runtime: RuntimeStatic;
    Context: Context;
    ContextEntity: ContextEntity;
    EntityProperty: EntityProperty;
    EntityRelationship: EntityRelationship;
    EntityRelationshipType: EntityRelationshipType;
    EntityMethod: EntityMethod;
    Entity: Entity;
    Transaction: TransactionStatic;
    EntityComparator: EntityComparator;
    isEntity: isEntity;
    Store: StoreStatic;
  }

  export interface RuntimeStatic {
    new(options: RuntimeOptions): Runtime;
    new(contextUri: string, options: RuntimeOptions): Runtime;
  }

  export interface RuntimeOptions {
    updateOnIntern?: boolean,
    debug?: {
      context: Context
    };
  }

  export interface Properties {
    [k: string]: any;
  }

  export interface Prototypes {
    [k: string]: Function;
  }

  interface Runtime extends NodeJS.EventEmitter {
    load(contextUri: string, protos?: Prototypes): Promise<Runtime>;
    clear(): Runtime;
    definition(name: string): ContextEntity;
    extend(type: string, protos: Prototypes): Runtime;
    intern<E extends Entity>(entity: E, updateOnIntern: boolean): E;
    build<E extends Entity>(type: string, obj: any): E;
    remove(entity: Entity): Runtime;
  }

  export interface Context {
    attributes?: JEFRiAttributes;
    entities: ContextEntities;
  }

  export interface JEFRiAttributes {
    [k: string]: any;
  }

  export interface ContextEntities {
    [k: string]: ContextEntity;
  }

  export interface ContextEntity {
    type?: string;
    Constructor?: Function;
    key: string;
    properties: { [k: string]: EntityProperty };
    relationships?: { [k: string]: EntityRelationship };
    methods?: { [k: string]: EntityMethod };
  }

  export interface EntityProperty {
    type: string;
    attributes?: JEFRiAttributes;
  }

  export enum JEFRiPropertyType {
    int, float, string, list, object, boolean
  }

  export interface EntityRelationship {
    type: string|EntityRelationshipType;
    property: string;
    to: {
      type: string,
      property: string;
    };
    back?: string;
  }

  export enum EntityRelationshipType {
    is_a,
    has_a,
    has_many
  }

  export interface EntityMethod {
    params?: { [k: string]: string },
    order?: string[],
    return?: string;
    definitions: {
      [k: string]: string;
      javascript: string;
    }
  }

  export enum EntityStatus {
    NEW, PERSISTED, MODIFIED
  }

  export interface EntityStatic {
    new (props: Properties): Entity;
    name: string;
  }

  export interface Entity {
    _id: string;
    _definition: ContextEntity;
    _status: string|EntityStatus;
    _events: NodeJS.EventEmitter;
    _type(full?: boolean): string;
    _metadata: EntityMetadata;
    id(full?: boolean): string;
    _encode(): any;
    toJSON(): any;
    _destroy(): void;
    _equal(e: Entity): boolean;
  }

  export interface EntityMetadata {
    _runtime: Runtime;
    _new: boolean;
    _modified: {
      _count: number,
      [k: string]: number|string|boolean|Array<number|string|boolean>
    };
    _fields: {
      [k: string]: number|string|boolean|Array<number|string|boolean>
    };
    _relationships: {
      [k: string]: Entity|Array<Entity>
    };
  }

  export interface EntityArray<E extends Entity> extends Array<E> {
    add(e: E): EntityArray<E>;
    remove(e: E): EntityArray<E>;
  }

  export interface TransactionStatic {
    new(context: Context, store: Store): Transaction;
  }

  export interface Transaction extends NodeJS.EventEmitter {
    encode(): {attributes: JEFRiAttributes, entities: Entity[]};
    toString(): string;
    get(store?: Store): Promise<Transaction>;
    persist(store?: Store): Promise<Transaction>;
    add(entities: Array<Entity>): Transaction;
    attributes(attrs: JEFRiAttributes): Transaction;
  }

  export interface EntityComparator {
    (a: Entity, b: Entity): boolean;
    (a: {[k: string]: any}, b: {[k: string]: any}): boolean;
  }

  export interface isEntity {
    (e: any): boolean;
  }

  export interface StoreStatic {
    new (options?: JEFRiAttributes): Store;
  }

  export enum StoreExecutionType { get, persist }

  export interface Store {
    execute(type: StoreExecutionType, t: Transaction): Promise<Transaction>;
    get(t: Transaction): Promise<Transaction>;
    persist(t: Transaction): Promise<Transaction>;
  }
}

declare module 'jefri' {
  var j: JEFRi.JEFRi;
  export = j;
}

