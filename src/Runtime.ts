import { EventEmitter } from 'events';
import { UUID, request } from 'jefri-jiffies';

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
      EventEmitter.call(this);

      // Set the entity key as early as possible.
      proto[definition.key] = proto[definition.key] || UUID.v4();

      let metadata: JEFRi.EntityMetadata = {
        _new: true,
        _modified: {_count: 0},
        _fields: {},
        _relationships: {},
        _runtime: EC
      };

      Object.defineProperties(this, {
        _id: {
          configurable: false,
          enumerable: true,
          get: function() { return `${type}/${this[definition.key]}`; }
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
    definition.Constructor.prototype = Object.create(Object.assign(EventEmitter.prototype, {
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
    }));

    for (let field in definition.properties) {
      this._build_mutacc(definition, field, definition.properties[field]);
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
        this.emit('modified', [field, value]);
      }
    });
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
    }
  }

  build<E extends JEFRi.Entity>(entityType: string, obj: any = {}): E {
    if (!this._context.entities[entityType]) {
      throw new Error(`${entityType} not defined in this runtime.`);
    }
    return <E>(new this._context.entities[entityType].Constructor(obj));
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

