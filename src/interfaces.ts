import {EventEmitter} from 'events';
import {
  EntityRelationshipType,
  EntityStatus,
  JEFRiPropertyType,
  StoreExecutionType
} from './enums';

export interface IRuntimeOptions {
  updateOnIntern?: boolean, debug?: {context: any};
}

export interface EntitySpec {
  _type: string;
  _id?: string;
  [k: string]: any;
}

export interface IRuntime extends EventEmitter {
  // constructor(options: IRuntimeOptions): IRuntime;
  // constructor(contextUri: string, options: IRuntimeOptions): IRuntime;
  load(contextUri: string, protos?: Prototypes): Promise<IRuntime>;
  clear(): IRuntime;
  definition(name: string): ContextEntity;
  extend(type: string, protos: Prototypes): IRuntime;
  intern<E extends Entity>(entity: E, updateOnIntern: boolean): E;
  build<E extends Entity>(type: string, obj: any): E;
  find<E extends Entity>(spec: EntitySpec): E[];
  remove(entity: Entity): IRuntime;
}

export interface ContextEntity {
  type?: string;
  Constructor?: Function;
  key: string;
  properties: {[k: string]: EntityProperty};
  relationships?: {[k: string]: EntityRelationship};
  methods?: {[k: string]: EntityMethod};
}

export interface EntityProperty {
  type: string;
  attributes?: JEFRiAttributes;
}

export interface EntityRelationship {
  type: string | EntityRelationshipType;
  property: string;
  to: { type: string, property: string; };
  back?: string;
}

export interface EntityMethod {
  params?: {[k: string]: string}, order?: string[], return?: string;
  definitions: {
    [k: string]: string;
    javascript?: string;
  }
}

export interface Properties { [k: string]: any; }

export interface Prototypes { [k: string]: Function; }

export interface EntityMetadata {
  _runtime: IRuntime;
  _new: boolean;
  _modified: {
    _count: number,
    [k: string]: number | string | boolean | Array<number | string | boolean>
  };
  _fields: {
    [k: string]: number | string | boolean | Array<number | string | boolean>
  };
  _relationships: {[k: string]: Entity | Array<Entity>};
}

export interface Context {
  attributes?: JEFRiAttributes;
  entities: ContextEntities;
}

export interface JEFRiAttributes { [k: string]: any; }

export interface ContextEntities { [k: string]: ContextEntity; }

export interface EntityStatic {
  new (props: Properties): Entity;
  name: string;
}

export interface BareEntity {
  _id: string;
  _type: string;
  [k: string]: string | number | boolean | string[];
}

export interface Entity {
  _id: string;
  _definition: ContextEntity;
  _status: string | EntityStatus;
  _events: NodeJS.EventEmitter;
  _type(full?: boolean): string;
  _metadata: EntityMetadata;
  id(full?: boolean): string;
  _encode(): BareEntity;
  toJSON(): any;
  _destroy(): void;
  _equals(e: Entity): boolean;
}

export type AnyEntity = Entity | BareEntity;

export interface TransactionSpec<T extends AnyEntity | EntitySpec> {
  attributes?: Properties, entities?: T[]
}

export interface ITransaction<T extends AnyEntity | EntitySpec> {
  entities: T[];
  encode(): {attributes: Properties, entities: T[]};
  toString(): string;
  get(store?: IStore): Promise<ITransaction<Entity>>;
  persist(store?: IStore): Promise<ITransaction<Entity>>;
  add(entities: T[]): ITransaction<T>;
  setAttributes(attrs: Properties): ITransaction<T>;
}

export interface IStoreStatic {
  new (runtime: IRuntime, options?: JEFRiAttributes): IStore;
}

export interface IStore {
  execute(
      type: StoreExecutionType,
      t: ITransaction<AnyEntity | EntitySpec>): Promise<ITransaction<Entity>>;
  get(t: ITransaction<EntitySpec>): Promise<ITransaction<Entity>>;
  persist(t: ITransaction<BareEntity>): Promise<ITransaction<Entity>>;
}
