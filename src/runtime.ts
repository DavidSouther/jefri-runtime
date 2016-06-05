import {EventEmitter} from 'events';
import {UUID, request, lock} from 'jefri-jiffies';

import {EntityComparator, EntityArray} from './jefri';

import {
  BareEntity,
  Context,
  ContextEntities,
  ContextEntity,
  Entity,
  EntityMetadata,
  EntityMethod,
  EntityProperty,
  EntityRelationship,
  EntitySpec,
  EntityStatic,
  IRuntime,
  IRuntimeOptions,
  JEFRiAttributes,
  Properties,
  Prototypes
} from './interfaces';

export class Runtime extends EventEmitter implements IRuntime {
  public ready: Promise<IRuntime> = null;
  public settings: {[k: string] : any} = {updateOnIntern : true};

  private _context = {meta : {}, contexts : {}, entities : {}, attributes : {}};

  private _instances = {};

  // #### Private helper functions
  // These handle most of the heavy lifting of building Entity classes.
  private _default(type: string): any {
    switch (type) {
    case "list":
      return [];
    case "object":
      return {};
    case "boolean":
      return false;
    case "int":
    case "float":
      return 0;
    case "string":
    default:
      return "";
    }
  }

  // Takes a "raw" context object and orders it into the internal _context
  // storage. Also builds constructors and prototypes for the context.
  private _set_context(context: Context, protos: Prototypes): void {
    // Save the context-level attributes.
    Object.assign(this._context.attributes, context.attributes || {});

    // Prepare each entity type.
    for (let type in context.entities) {
      let definition = context.entities[type];
      definition.type = type;
      this._build_constructor(definition, type);
    }
  }

  private _build_constructor(definition: ContextEntity, type: string): void {
    // Save a reference to the context, for constructors.
    const EC = this;
    this._context.entities[type] = definition;
    this._instances[type] = {};

    const ctor = function(proto: {[k: string] : any} = {}) {
      // Set the entity key as early as possible.
      proto[definition.key] = proto[definition.key] || UUID.v4();

      let metadata: EntityMetadata = {
        _new : true,
        _modified : {_count : 0},
        _fields : {},
        _relationships : {},
        _runtime : EC
      };

      let events: EventEmitter = new EventEmitter();

      Object.defineProperties(this, {
        _id : {
          configurable : false,
          enumerable : true,
          get : function() { return this[definition.key]; }
        },
        _definition : {
          configurable : false,
          enumerable : false,
          get : function() { return definition; }
        },
        _metadata : {
          configurable : false,
          enumerable : false,
          get : function() { return metadata; }
        },
        _events : {
          configurable : false,
          enumerable : false,
          get : function() { return events; }
        },
        _status : {
          configurable : false,
          enumerable : false,
          // Determine the status of the entity.
          get : function() {
            if (this._metadata._new) {
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
        (function(name: string) {
          let property = definition.properties[name];
          let dflt = proto[name] || EC._default(property.type);
          this._metadata._fields[name] = dflt;
          Object.defineProperty(this, name, {
            configurable : false,
            enumerable : true,
            get : function() {
              const descriptor = Object.getOwnPropertyDescriptor(
                  definition.Constructor.prototype, name);
              return descriptor.get.call(this);
            },
            set : function(value: any) {
              const descriptor = Object.getOwnPropertyDescriptor(
                  definition.Constructor.prototype, name);
              return descriptor.set.call(this, value);
            }
          });
        }.call(this, name));
      }
    };

    // Use eval to create a function with a name suitable for logs, etc
    const body = `ctor.apply(this, arguments);`;
    eval(`definition.Constructor = function ${type}(){ ${body} }`);

    // Set up the prototype for this entity.
    this._build_prototype(type, definition);
  }

  private _build_prototype(type: string, definition: ContextEntity,
                           protos: Prototypes = {}) {
    definition.Constructor.prototype = Object.create({
      _type : function(full: boolean = false) : string {
        // Get the entity's type, possibly including the context name.
        return type;
      },
      id : function(full: boolean = false) : string {
        // Return the id, possibly including the simple entity type.
        let typePrefix: string = '';
        if (full) {
          typePrefix = this._type() + '/';
        }
        return `${typePrefix}${this._id}`;
      },
      _equals : function(other: Entity) {
        return EntityComparator(this, other);
      },
      _encode : function() {
        return Object.assign(
            {
              _type : this._type(),
              _id : this._id,
            },
            this._metadata._fields);
      },
      _destroy :
          lock(function():
                   void {
                     this._events.emit('destroying');
                     for (let name in Object.keys(definition.relationships)) {
                       let rel = definition.relationships[name];
                       try {
                         this[name].remove(this);
                       } catch (e) {
                         this[name] = null;
                       }
                     }
                     this[definition.key] = '';
                   })
    });

    for (let field in definition.properties) {
      this._build_mutacc(definition, field, definition.properties[field]);
    }

    for (let field in definition.relationships) {
      this._build_relationship(definition, field,
                               definition.relationships[field]);
    }

    for (let field in definition.methods) {
      this._build_method(definition, field, definition.methods[field]);
    }
  }

  private _build_mutacc(definition: ContextEntity, field: string,
                        property: EntityProperty): void {
    Object.defineProperty(definition.Constructor.prototype, field, {
      configurable : false,
      enumerable : true,
      get : function() { return this._metadata._fields[field]; },
      set : function(value) {
        // Only update when it is a different value.
        if (this._metadata._fields[field] !== value) {
          // The actual set.
          this._metadata._fields[field] = value;

          // Update the modified list, if set.
          if (typeof this._metadata._modified[field] === 'undefined') {
            this._metadata._modified[field] = value;
            this._metadata._modified._count += 1;
          }
        }
        this._events.emit('modified property', [ field, value ]);
      }
    });
  }

  private _build_relationship(definition: ContextEntity, field: string,
                              relationship: EntityRelationship): void {
    let getter: () => Entity = null;
    let setter: (value: Entity | any[]) => void = null;

    if (relationship.type === 'has_many') {
      let property = definition.properties[relationship.property];
      if (property && property.type === 'list') {
        getter = _has_many_list_get;
        setter = function() {};
      } else {
        getter = _has_many_get;
        setter = function() {};
      }
    } else {
      getter = _has_one_get;
      setter = _has_one_set();
    }

    Object.defineProperty(
        definition.Constructor.prototype, field,
        {enumerable : false, configurable : false, get : getter, set : setter});

    function _has_many_list_get() {
      this[relationship.property] = this[relationship.property] || [];
      if (!this._metadata._relationships.hasOwnProperty(field)) {
        // Create the EntityArray, and fill it from the list property IDs.
        this._metadata._relationships[field] =
            new EntityArray(this, field, relationship);
        this[relationship.property].forEach((id: string) => {
          this._metadata._relationships[field].add(
              this._metadata._runtime._instances[relationship.to.type][id]);
        });
        // Use the EntityArray events to maintain the accuracy of the ID list.
        this._metadata._relationships[field]._events.on(
            EntityArray.ADD,
            (e: Entity) => { this[relationship.property].push(e.id()); });
        this._metadata._relationships[field]._events.on(
            EntityArray.REMOVE, (e: Entity) => {
              let i = this[relationship.property].indexOf(e.id());
              this[relationship.property].slice(i, 1);
            });
      }
      return this._metadata._relationships[field];
    }

    function _has_many_get() {
      let list = this._metadata._relationships[field];
      if (!list) {
        list = this._metadata._relationships[field] =
            new EntityArray(this, field, relationship);
        for (let id
                 of this._metadata._runtime._instances[relationship.to.type]) {
          let entity = this._metadata._runtime._instances[id];
          if (entity[relationship.to.property] == this[relationship.property]) {
            list.add(entity);
          }
        }
      }
      return list;
    }

    function _has_one_get(): Entity {
      if (!this._metadata._relationships[field]) {
        // Try to find the entity
        let instances = this._metadata._runtime._instances;
        let instance =
            instances[relationship.to.type][this[relationship.property]];
        if (!instance) {
          // We need to make one
          let key = {[relationship.to.property] : this[relationship.property]};
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
    function _has_one_set(): (related: Entity) => void {
      return <(r: Entity) => void>lock(function(related: Entity): void {
        if (related === null) {
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
            try {
              related[relationship.back].add(this);
            } catch (e) {
              related[relationship.back] = this;
            }
          }
        }
        this._events.emit('modified relationship', [ field, related ]);
      });
    }

    function _resolve_ids(related: Entity) {
      if (!related) {
        this.relationship.property = void 0;
      } else if (definition.key === relationship.property) {
        related[relationship.to.property] = this[relationship.property];
      } else if (related._definition.key === relationship.to.property) {
        this[relationship.property] = related[relationship.to.property];
      } else {
        if (this[relationship.to.property].match(UUID.rvalid)) {
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

  private _build_method(definition: ContextEntity, field: string,
                        method: EntityMethod): void {
    method.definitions = method.definitions || {};
    method.order = method.order || [];
    let params: any[] = method.order;
    let body: string = method.definitions['javascript'] || '';
    let fn: Function = function() {};
    if (!body.match(/window/)) {
      params.push(body);
      fn = Function.apply(null, params);
    }
    definition.Constructor.prototype[field] = fn;
  }

  constructor(contextUri: string, options: IRuntimeOptions = {},
              protos: any = {}) {
    super();

    let ready: {
      promise : Promise<IRuntime>,
      reject : Function,
      resolve : Function
    } = {promise : null, reject : null, resolve : null};
    this.ready = ready.promise = new Promise((resolve, reject) => {
      ready.resolve = resolve;
      ready.reject = reject;
    });

    // Fill in all the privileged properties
    Object.assign(this.settings, options);

    if (contextUri !== '') {
      this.load(contextUri, protos)
          .then(() => ready.resolve(this), (e: any) => ready.reject(e));
    } else if (options.debug) {
      this._set_context(options.debug.context, protos);
      ready.resolve(this);
    }
  }

  build<E extends Entity>(entityType: string, obj: any = {}): E {
    if (!this._context.entities[entityType]) {
      throw new Error(
          `JEFRi::Runtime::build '${entityType}' is not a defined type in this context.`);
    }

    let definition = this.definition(entityType);
    let entity: E = null;
    if (definition && obj.hasOwnProperty(definition.key)) {
      entity = <E>this._instances[entityType][obj._id];
    }
    if (!entity) {
      entity = <E>(new this._context.entities[entityType].Constructor(obj));
      this._instances[entityType][entity.id()] = entity;
    }
    return entity;
  }

  load(contextUri: string, protos: Prototypes = {}): Promise<IRuntime> {
    return request(contextUri)
        .then((data: string) => {
          this._set_context(JSON.parse(data), protos);
          return this;
        })
        .catch((e: any) => {
          console.error('Could not load context.');
          console.warn(e);
          console.log(e.stack);
          throw e;
        });
  }

  clear(): Runtime {
    this._instances = {};
    return this;
  }

  definition(name: string | Entity): ContextEntity {
    if (typeof name === 'string') {
      return this._context.entities[name];
    } else {
      return name._definition;
    }
  }

  extend(type: string, protos: Prototypes): IRuntime { return this; }

  intern<E extends Entity>(entity: E, updateOnIntern: boolean): E {
    return entity;
  }

  remove(entity: Entity): IRuntime { return this; }

  find<E extends Entity>(spec: string | EntitySpec): E[] {
    let rspec: EntitySpec = null;
    if (typeof spec === 'string') {
      rspec = {_type : spec};
    } else {
      rspec = spec;
    }

    let to_return: E[] = [];

    let def = this.definition(rspec._type);
    if (def.key in rspec || '_id' in rspec) {
      let key = rspec[def.key] || rspec['_id'];
      let e = this._instances[rspec._type][key];
      if (e) {
        to_return.push(e);
      }
    } else {
      for (let id in this._instances[rspec._type]) {
        let e: E = this._instances[rspec._type][id];
        let matches = true;
        for (let key in rspec) {
          if (e[key] !== rspec[key]) {
            matches = false;
          }
        }
        if (matches) {
          to_return.push(e);
        }
      }
    }

    return to_return;
  }
}
