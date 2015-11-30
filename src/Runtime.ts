import { EventEmitter } from 'events';
import { UUID, request, lock } from 'jefri-jiffies';

import { EntityComparator } from './jefri';

export class Runtime extends EventEmitter implements JEFRi.Runtime {
  public ready: Promise<JEFRi.Runtime> = null;
  public settings: {[k: string]: any} = {
    updateOnIntern: true
  };

  private _context = {
    meta: {},
    contexts: {},
    entities: {},
    attributes: {}
  };

  private _instances = { };

  // #### Private helper functions
  // These handle most of the heavy lifting of building Entity classes.
  private _default(type: string): any {
    switch(type) {
      case "list": return [];
      case "object": return {};
      case "boolean": return false;
      case "int": case "float": return 0;
      case "string": default: return "";
    }
  }

  // Takes a "raw" context object and orders it into the internal _context
  // storage. Also builds constructors and prototypes for the context.
  _set_context(context: JEFRi.Context, protos: JEFRi.Prototypes): void {
    // Save the context-level attributes.
    Object.assign(this._context.attributes, context.attributes || {});

    // Prepare each entity type.
    for(let type in context.entities) {
      let definition = context.entities[type];
      definition.type = type;
      this._build_constructor(definition, type);
    }
  }

  _build_constructor(definition: JEFRi.ContextEntity, type: string): void {
    // Save a reference to the context, for constructors.
    const EC = this;
    this._context.entities[type] = definition;
    this._instances[type] = {};

    definition.Constructor = function( proto: {[k: string]: any} = {}) {
      // Set the entity key as early as possible.
      proto[definition.key] = proto[definition.key] || UUID.v4();

      let metadata: JEFRi.EntityMetadata = {
        _new: true,
        _modified: {_count: 0},
        _fields: {},
        _relationships: {},
        _runtime: EC
      };

      let events: EventEmitter = new EventEmitter();

      Object.defineProperties(this, {
        _id: {
          configurable: false,
          enumerable: true,
          get: function() { return this[definition.key]; }
        },
        _definition: {
          configurable: false,
          enumerable: false,
          get: function() { return definition; }
        },
        _metadata: {
          configurable: false,
          enumerable: false,
          get: function() { return metadata; }
        },
        _events: {
          configurable: false,
          enumerable: false,
          get: function() { return events; }
        },
        _status: {
          configurable: false,
          enumerable: false,
          // Determine the status of the entity.
          get: function() {
            if(this._metadata._new) {
              return "NEW";
            } else if (this._metadata._modified._count === 0) {
              return "PERSISTED";
            } else {
              return "MODIFIED";
            }
          }
        }
      });

      // Set a bunch of default values, so they're all available.
      for (let name in definition.properties) {
        let property = definition.properties[name];
        let dflt= proto[name] || EC._default(property.type);
        this._metadata._fields[name] = dflt;
      }
    };

    definition.Constructor.name = type;

    // Set up the prototype for this entity.
    this._build_prototype(type, definition);
  }

  _build_prototype(
      type: string,
      definition: JEFRi.ContextEntity,
      protos: JEFRi.Prototypes = {}
  ) {
    definition.Constructor.prototype = Object.create({
      _type: function(full: boolean = false): string {
        // Get the entity's type, possibly including the context name.
        return type;
      },
      id: function(full: boolean = false): string {
        // Return the id, possibly including the simple entity type.
        let typePrefix: string = '';
        if (full) { typePrefix = this._type() + '/'; }
        return `${typePrefix}${this._id}`;
      },
      _equal: function(other: JEFRi.Entity) {
        return EntityComparator(this, other);
      }
    });

    for (let field in definition.properties) {
      this._build_mutacc(definition, field, definition.properties[field]);
    }

    for (let field in definition.relationships) {
      this._build_relationship(
        definition,
        field,
        definition.relationships[field]
      );
    }
  }

  _build_mutacc(
      definition: JEFRi.ContextEntity,
      field: string,
      property: JEFRi.EntityProperty
  ): void {
    Object.defineProperty(definition.Constructor.prototype, field, {
      configurable: false,
      enumerable: true,
      get: function() { return this._metadata._fields[field]; },
      set: function(value) {
        // Only update when it is a different value.
        if(this._metadata._fields[field] !== value) {
          // The actual set.
          this._metadata._fields[field] = value;

          // Update the modified list, if set.
          if(typeof this._metadata._modified[field] === 'undefined') {
            this._metadata._modified[field] = value;
            this._metadata._modified._count += 1;
          }
        }
        this._events.emit('modified property', [field, value]);
      }
    });
  }

  _build_relationship(
      definition: JEFRi.ContextEntity,
      field: string,
      relationship: JEFRi.EntityRelationship
  ): void {
    let getter: () => JEFRi.Entity = null;
    let setter: (value: JEFRi.Entity) => void = null;

    if (relationship.type === 'has_many') {
      let property = definition.properties[relationship.property];
      if (property && property.type === 'list') {
      } else {
      }
    } else {
      getter = _has_one_get;
      setter = _has_one_set();
    }

    Object.defineProperty(definition.Constructor.prototype, field, {
      enumerable: false,
      configurable: false,
      get: getter,
      set: setter
    });

    function _has_one_get(): JEFRi.Entity {
      if (!this._metadata._relationships[field]) {
        // Try to find the entity
        let instances = this._metadata._runtime._instances;
        let instance = instances[relationship.to.type][this[relationship.property]];
        if (!instance) {
          // We need to make one
          let key = {
            [relationship.to.property]: this[relationship.property]
          };
          instance = this._metadata._runtime.build(relationship.to.type, key);
        }
        this[field] = instance;
      }
      return this._metadata._relationships[field];
    }

    // Generate an accessor for a has_one relationship type.
    // This accessor will return a single instance of the remote reference,
    // and will follow appropriate back references.
    //
    // The local entity should have some string property whose value will match
    // the remote entity's key property.
    function _has_one_set(): (related: JEFRi.Entity) => void {
      return <(r: JEFRi.Entity) => void>lock(
          function(related: JEFRi.Entity
      ): void {
        if(related === null) {
          // Actually a remove.
          related = this._metadata._relationships[field];
          if (related) {
            try {
              related[relationship.back].remove(this);
            } catch (e) {
              related[relationship.back] = null;
            }
          }
          this._metadata._relationships[field] = null;
          this[relationship.property] = null;
        } else {
          this._metadata._relationships[field] = related;
          _resolve_ids.call(this, related);
          if (relationship.back) {
            related[relationship.back] = this;
          }
        }
        this._events.emit('modified relationship', [field, related]);
      });
    }

    function _resolve_ids(related: JEFRi.Entity) {
      if(!related) {
        this.relationship.property = void 0;
      } else if (definition.key === relationship.property) {
        related[relationship.to.property] = this[relationship.property];
      } else if (related._definition.key === relationship.to.property) {
        this[relationship.property] = related[relationship.to.property];
      } else {
        if(this[relationship.to.property].match(UUID.rvalid)) {
          related[relationship.to.property] = this[relationship.to.property];
        } else if (related[relationship.to.property].match(UUID.rvalid)) {
          this[relationship.property] = related[relationship.to.property];
        } else {
          let id: string = UUID.v4();
          this[relationship.property] = id;
          related[relationship.to.property] = id;
        }
      }
    }
  }

  constructor(contextUri: string, options: any = {}, protos: any = {}) {
    super();

    let ready: {
      promise: Promise<JEFRi.Runtime>,
      reject: Function,
      resolve: Function
    } = { promise: null, reject: null, resolve: null };
    this.ready = ready.promise = new Promise((resolve, reject) => {
      ready.resolve = resolve;
      ready.reject = reject;
    });

    // Fill in all the privileged properties
    Object.assign(this.settings, options);

    if (contextUri !== '') {
      this.load(contextUri, protos)
        .then(()=>ready.resolve(this), (e: any)=> ready.reject(e));
    } else if (options.debug) {
      this._set_context(options.debug.context, protos);
      ready.resolve(this);
    }
  }

  build<E extends JEFRi.Entity>(entityType: string, obj: any = {}): E {
    if (!this._context.entities[entityType]) {
      throw new Error(`${entityType} not defined in this runtime.`);
    }

    let definition = this.definition(entityType);
    let entity: E = null;
    if (definition && obj.hasOwnProperty(definition.key)) {

    } else {
      entity = <E>(new this._context.entities[entityType].Constructor(obj));
      this._instances[entityType][entity.id()] = entity;
    }
    return entity;
  }

  load(contextUri: string, protos: JEFRi.Prototypes = {}): Promise<JEFRi.Runtime> {
    return request(contextUri)
      .then((data: string) => {
        this._set_context(JSON.parse(data), protos);
        return this;
      }).catch((e: any) => {
        console.error('Could not load context.');
        console.warn(e);
        console.log(e.stack);
        throw e;
      });
  }

  clear(): Runtime { return this; }

  definition(name: string): JEFRi.ContextEntity { return null; }

  extend(type: string, protos: JEFRi.Prototypes): JEFRi.Runtime { return this; }

  intern<E extends JEFRi.Entity>(entity: E, updateOnIntern: boolean): E {
    return entity;
  }

  remove(entity: JEFRi.Entity): JEFRi.Runtime {
    return this;
  }
}

