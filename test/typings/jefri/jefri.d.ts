/// <reference path="../node/node.d.ts" />
/// <reference path="../es6-promise/es6-promise.d.ts" />

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

  export interface Prototypes {
    [k: string]: any;
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
    key: string;
    properties: { [k: string]: EntityProperty };
    relationships?: { [k: string]: EntityRelationship };
    methods?: { [k: string]: EntityMethod };
  }

  export interface EntityProperty {
    type: string|JEFRiPropertyType;
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
    params?: { [k: string]: string|JEFRiPropertyType },
    order?: string[],
    return?: string|JEFRiPropertyType;
    definitions: {
      [k: string]: string;
      javascript: string;
    }
  }

  export enum EntityStatus {
    NEW, PERSISTED, MODIFIED
  }

  export interface Entity extends NodeJS.EventEmitter {
    _type(full?: boolean): string;
    id(full?: boolean): string;
    _definition(): ContextEntity;
    _status(): string|EntityStatus;
    _encode(): any;
    toJSON(): any;
    _destroy(): void;
    _compare(e: Entity): boolean;
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

