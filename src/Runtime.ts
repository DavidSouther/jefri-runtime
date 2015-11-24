import { EventEmitter } from 'events';
import { UUID, request } from 'jefri-jiffies';

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

    definition.Constructor = function(proto: {[k: string]: any} = {}) {
      EventEmitter.call(this);

      Object.assign(this, {
        _new: true,
        _modified: {_count: 0},
        _fields: {},
        _relationships: {},
        _runtime: EC
      });

      // Set the key, if not provided.
      proto[definition.key] = proto[definition.key] || UUID.v4();

      // Set a bunch of default values, so they're all available.
      for (let name in definition.properties) {
        let property = definition.properties[name];
        let def = proto[name] || EC._default(property.type);
        this[name] = def;
      }

      // Attach a privileged copy of the full id, more for debugging than use.
      //this._id = this.id(true);
    };
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

