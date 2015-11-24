declare module JEFRiContext {
  interface Context {
    Context: JEFRiContext.Context;
    Entity: JEFRiContext.Entity;
    Property: JEFRiContext.Property;
    Relationship: JEFRiContext.Relationship;
  }

  interface Context extends JEFRi.Entity {
    context_id: string;
    name: string;
    entities: JEFRi.EntityArray<Entity>;
    export(): string;
  }

  interface Entity extends JEFRi.Entity {
    entity_id: string;
    context_id: string;
    name: string;
    key: string;
    context: Context;
    properties: JEFRi.EntityArray<Property>;
    relationships: JEFRi.EntityArray<Relationship>;
    export(): string;
  }

  interface Property extends JEFRi.Entity {
    property_id: string;
    entity_id: string;
    name: string;
    type: string;
    entity: Entity;
    export(): string;
  }

  interface Relationship extends JEFRi.Entity {
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
}

declare module "jefri-context" {
  var c: JEFRiContext.Context;
  export = c;
}

