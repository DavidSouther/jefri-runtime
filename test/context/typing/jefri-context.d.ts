import {
  Entity as JEFRiEntity,
  EntityArray as JEFRiEntityArray
} from '../../../src/index';

export interface Context extends JEFRiEntity {
  context_id: string;
  name: string;
  entities: JEFRiEntityArray<Entity>;
  export(): string;
}

export interface Entity extends JEFRiEntity {
  entity_id: string;
  context_id: string;
  name: string;
  key: string;
  context: Context;
  properties: JEFRiEntityArray<Property>;
  relationships: JEFRiEntityArray<Relationship>;
  export(): string;
}

export interface Property extends JEFRiEntity {
  property_id: string;
  entity_id: string;
  name: string;
  type: string;
  entity: Entity;
  export(): string;
}

export interface Relationship extends JEFRiEntity {
  relationship_id: string;
  name: string;
  type: string;
  to_id: string;
  to_property: string;
  from_id: string;
  from_property: string;
  back: string;
  to: Entity;
  from: Entity;
  normalize(): string;
  export(): string;
}
