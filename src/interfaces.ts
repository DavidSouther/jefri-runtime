import {EventEmitter} from 'events';
import {
  EntityRelationshipType,
  EntityStatus,
  JEFRiPropertyType,
  StoreExecutionType
} from './enums';

export interface IRuntimeOptions {
  updateOnIntern?: boolean, debug?: {context: Context};
}

export interface EntitySpec {
  _type: string;
  _id?: string;
  [k: string]: any;
}

export interface IRuntime extends EventEmitter {
  constructor(options: IRuntimeOptions): IRuntime;
  constructor(contextUri: string, options: IRuntimeOptions): IRuntime;
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

export interface TransactionSpec {
  attributes?: Properties, entities?: BareEntity[]
}

export interface ITransaction {
  encode(): {attributes: Properties, entities: BareEntity[]};
  toString(): string;
  get(store?: IStore): Promise<ITransaction>;
  persist(store?: IStore): Promise<ITransaction>;
  add(entities: Array<BareEntity>): ITransaction;
  setAttributes(attrs: Properties): ITransaction;
}

export interface IStore {
  new (options?: JEFRiAttributes): IStore;
  execute(type: StoreExecutionType, t: ITransaction): Promise<ITransaction>;
  get(t: ITransaction): Promise<ITransaction>;
  persist(t: ITransaction): Promise<ITransaction>;
}
