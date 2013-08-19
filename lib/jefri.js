var _ = require("superscore");
var Q = require("q");
var R = require("request");
var Request = function(uri, body){
	defer = Q.defer();

	cb = function(err, res, body){
		if(err) return defer.reject(err);
		defer.resolve(body, res);
	}

	options = {method: body ? "POST" : "GET"};
	if(body) options.body = body;

	R(uri, options, cb);

	return defer.promise;
}

var EventDispatcher;

EventDispatcher = function() {};

EventDispatcher.prototype = {
  on: function(event, fn) {
    var listeners;
    if (this._listeners === undefined) {
      this._listeners = {};
    }
    listeners = this._listeners;
    if (listeners[event] === undefined) {
      listeners[event] = [];
    }
    if (listeners[event].indexOf(fn) === -1) {
      return listeners[event].push(fn);
    }
  },
  off: function(event, fn) {
    var index, listeners;
    if (this._listeners === undefined) {
      return;
    }
    listeners = this._listeners;
    index = listeners[event].indexOf(fn);
    if (index !== -1) {
      return listeners[event].splice(index, 1);
    }
  },
  trigger: function(event, args) {
    var listener, listenerArray, listeners, _i, _len, _results;
    if (this._listeners === undefined) {
      return;
    }
    listeners = this._listeners;
    listenerArray = listeners[event.event];
    if (listenerArray !== undefined) {
      event.target = this;
      _results = [];
      for (_i = 0, _len = listenerArray.length; _i < _len; _i++) {
        listener = listenerArray[_i];
        _results.push(listener.call(this, event));
      }
      return _results;
    }
  }
};

var EntityArray, JEFRi, pushResult,
  __slice = [].slice;

JEFRi = {
  EntityComparator: function(a, b) {
    var cmp;
    cmp = a && b && a._type() === b._type() && a.id() === b.id();
    return cmp;
  },
  isEntity: function(obj) {
    return obj._type && obj.id && _.isFunction(obj._type) && _.isFunction(obj.id);
  }
};

EntityArray = function(entity, field, relationship) {
  this.entity = entity;
  this.field = field;
  this.relationship = relationship;
};

EntityArray.prototype = Object.create(Array.prototype);

EntityArray.prototype.remove = function(entity) {
  var e, i;
  if (entity === null) {
    return;
  }
  i = this.length - 1;
  while (i > -1) {
    if (this[i]._compare(entity)) {
      if (this.relationship.back) {
        e = this[i];
        try {
          e[this.relationship.back].remove(this);
        } catch (_error) {
          e[this.relationship.back] = null;
        }
      }
      this.splice(i, 1);
    }
    i--;
  }
  return this;
};

EntityArray.prototype.add = function(entity) {
  if (!_(this.entity._relationships[this.field]).find(_.bind(JEFRi.EntityComparator, null, entity))) {
    this.entity._relationships[this.field].push(entity);
    if (this.relationship.back) {
      entity[this.relationship.back] = this.entity;
    }
  }
  return this.entity;
};

_.mixin({
  isEntity: JEFRi.isEntity
});

JEFRi.Runtime = function(contextUri, options, protos) {
  var ec, ready, settings, _build_constructor, _build_method, _build_mutacc, _build_prototype, _build_relationship, _default, _set_context,
    _this = this;
  if (!this instanceof JEFRi.Runtime) {
    return new JEFRi.Rutime(contextUri, options, protos);
  }
  ec = this;
  if (!_.isString(contextUri)) {
    protos = options;
    options = contextUri;
    contextUri = '';
  }
  ready = Q.defer();
  settings = {
    updateOnIntern: true
  };
  _(settings).extend(options);
  _(this).extend({
    settings: settings,
    ready: ready.promise,
    _context: {
      meta: {},
      contexts: {},
      entities: {},
      attributes: {}
    },
    _instances: {}
  });
  _default = function(type) {
    switch (type) {
      case "boolean":
        return false;
      case "int" || "float":
        return 0;
      case "string":
        return "";
      default:
        return "";
    }
  };
  _set_context = function(context, protos) {
    var definition, type, _ref, _results;
    _(_this._context.attributes).extend(context.attributes || {});
    _ref = context.entities;
    _results = [];
    for (type in _ref) {
      definition = _ref[type];
      _results.push(_build_constructor(definition, type));
    }
    return _results;
  };
  _build_constructor = function(definition, type) {
    _this._context.entities[type] = definition;
    _this._instances[type] = {};
    definition.Constructor = function(proto) {
      var def, name, property, _ref;
      _(this).extend({
        _new: true,
        _modified: {
          _count: 0
        },
        _fields: {},
        _relationships: {},
        _runtime: ec
      });
      proto = proto || {};
      proto[definition.key] = proto[definition.key] || _.UUID.v4();
      _ref = definition.properties;
      for (name in _ref) {
        property = _ref[name];
        def = proto[name] || _default(property.type);
        this[name] = def;
      }
      this._id = this.id(true);
      _(this.prototype).extend(proto.prototype);
      this.on("persisted", function() {
        return _(this).extend({
          _new: false,
          _modified: {
            _count: 0
          }
        });
      });
      return this;
    };
    return _build_prototype(type, definition, protos && protos[type]);
  };
  _build_prototype = function(type, definition, proto) {
    var field, func, method, property, rel_name, relationship, _ref, _ref1, _ref2;
    _(definition.Constructor.prototype).extend(EventDispatcher.prototype, {
      _type: function(full) {
        full = full || false;
        return type;
      },
      id: function(full) {
        return "" + (full ? "" + (this._type()) + "/" : "") + this[definition.key];
      },
      _status: function() {
        var state;
        state = "MODIFIED";
        if (this._new) {
          state = "NEW";
        } else if (_.isEmpty(this._modified)) {
          state = "PERSISTED";
        }
        return state;
      },
      _definition: function() {
        return definition;
      },
      _persist: function(transaction, callback) {
        var deferred, top;
        deferred = _.Deferred().then(callback);
        top = !transaction;
        transaction = top ? new JEFRi.Transaction() : transaction;
        transaction.add(this);
        this.on("persisting", transaction);
        if (top) {
          transaction.persist(callback);
        }
        return deferred.promise();
      },
      _encode: function() {
        var min, prop;
        min = {
          _type: this._type(),
          _id: this.id()
        };
        for (prop in definition.properties) {
          min[prop] = this[prop]();
        }
        return min;
      },
      _destroy: _.lock(function() {
        var name, rel, _ref;
        this.trigger("destroying", {});
        _ref = definition.relationships;
        for (name in _ref) {
          rel = _ref[name];
          if (rel.type === "has_many") {
            this[name].remove(this);
          } else {
            this[name] = null;
          }
        }
        ec.destroy(this);
        this[definition.key] = 0;
        return this.trigger("destroyed", {});
      }),
      _compare: function(b) {
        return JEFRi.EntityComparator(this, b);
      }
    });
    definition.Constructor.prototype.toJSON = definition.Constructor.prototype._encode;
    _ref = definition.properties;
    for (field in _ref) {
      property = _ref[field];
      _build_mutacc(definition, field, property);
    }
    _ref1 = definition.relationships;
    for (rel_name in _ref1) {
      relationship = _ref1[rel_name];
      _build_relationship(definition, rel_name, relationship);
    }
    _ref2 = definition.methods;
    for (method in _ref2) {
      func = _ref2[method];
      _build_method(definition, method, func);
    }
    if (proto) {
      return _(definition.Constructor.prototype).extend(proto.prototype);
    }
  };
  _build_mutacc = function(definition, field, property) {
    return Object.defineProperty(definition.Constructor.prototype, field, {
      set: function(value) {
        if (value !== this._fields[field]) {
          this._fields[field] = value;
          if (!this._modified[field]) {
            this._modified[field] = this._fields[field];
            this._modified._count += 1;
          } else {
            if (this._modified[field] === value) {
              delete this._modified[field];
              this._modified._count -= 1;
            }
          }
          return this.trigger("modified", [field, value]);
        }
      },
      get: function() {
        return this._fields[field];
      }
    });
  };
  _build_relationship = function(definition, field, relationship) {
    var access, resolve_ids;
    access = "has_many" === relationship.type ? {
      get: function() {
        var id, type, _ref;
        if (!(field in this._relationships)) {
          this._relationships[field] = new EntityArray(this, field, relationship);
          _ref = ec._instances[relationship.to.type];
          for (id in _ref) {
            type = _ref[id];
            if (type[relationship.to.property] === this[relationship.property]) {
              this._relationships[field].add(type);
            }
          }
        }
        return this._relationships[field];
      },
      set: function() {
        var entity, relations, _i, _len;
        relations = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        relations = _(relations).flatten();
        this[field];
        for (_i = 0, _len = relations.length; _i < _len; _i++) {
          entity = relations[_i];
          this._relationships[field].add(entity);
        }
        this.trigger("modified", [field, arguments]);
        return this;
      }
    } : {
      set: _.lock(function(related) {
        var _ref, _ref1;
        if (related === null) {
          if ("is_a" !== relationship.type) {
            try {
              if ((_ref = this._relationships[field]) != null) {
                _ref[relationship.back].remove(this);
              }
            } catch (_error) {
              if ((_ref1 = this._relationships[field]) != null) {
                _ref1[relationship.back] = null;
              }
            }
          }
          this._relationships[field] = null;
          this[relationship.property] = void 0;
        } else {
          this._relationships[field] = related;
          resolve_ids.call(this, related);
          if ("is_a" !== relationship.type) {
            if (relationship.back) {
              if (related != null) {
                related[relationship.back] = this;
              }
            }
          }
          this.trigger("modified", [field, related]);
        }
        return this;
      }),
      get: function() {
        var key;
        if (this._relationships[field] === void 0) {
          this._relationships[field] = ec._instances[relationship.to.type][this[relationship.property]];
          if (this._relationships[field] === void 0) {
            key = {};
            key[relationship.to.property] = this[relationship.property];
            this[field] = ec.build(relationship.to.type, key);
          }
        }
        return this._relationships[field];
      }
    };
    Object.defineProperty(definition.Constructor.prototype, field, access);
    return resolve_ids = function(related) {
      var id;
      if (related === void 0) {
        return this[relationship.property] = void 0;
      } else if (definition.key === relationship.property) {
        return related[relationship.to.property] = this[relationship.property];
      } else if (related._definition().key === relationship.to.property) {
        return this[relationship.property] = related[relationship.to.property];
      } else {
        if (this[relationship.property].match(_.UUID.rvalid)) {
          return related[relationship.to.property] = this[relationship.property];
        } else if (related[relationship.to.property].match(_.UUID.rvalid)) {
          return this[relationship.property] = related[relationship.to.property];
        } else {
          id = _.UUID.v4();
          this[relationship.property] = id;
          return related[relationship.to.property] = id;
        }
      }
    };
  };
  _build_method = function(definition, method, func) {
    var body, fn, params;
    func = {
      definitions: func.definitions || {},
      order: func.order || []
    };
    body = func.definitions.javascript || "";
    params = func.order;
    if (body && !body.match(/window/)) {
      params.push(body);
      fn = Function.apply(null, params);
    } else {
      fn = _.noop;
    }
    return definition.Constructor.prototype[method] = fn;
  };
  this.load = function(contextUri, prototypes) {
    return Request(contextUri).then(function(data) {
      data = data || "{}";
      data = _.isString(data) ? JSON.parse(data) : data;
      _set_context(data, prototypes);
      return ready.resolve();
    })["catch"](function(e) {
      return ready.reject(e);
    }).done();
  };
  if (options && options.debug) {
    _set_context(options.debug.context, protos);
    ready.resolve();
  }
  if (contextUri) {
    this.load(contextUri, protos);
  }
  return this;
};

pushResult = function(entity) {
  var type;
  type = entity._type();
  if (!this[type]) {
    this[type] = [];
  }
  return this[type].push(entity);
};

_(JEFRi.Runtime.prototype).extend(JEFRi.Runtime.prototype);

_(JEFRi.Runtime.prototype).extend({
  clear: function() {
    this._instances = {};
    return this;
  },
  definition: function(name) {
    name = (typeof name._type === "function" ? name._type() : void 0) || name;
    return this._context.entities[name];
  },
  extend: function(type, extend) {
    if (this._context.entities[type]) {
      _(this._context.entities[type].Constructor.prototype).extend(extend.prototype);
    }
    return this;
  },
  intern: function(entity, updateOnIntern) {
    var ent, entities, ret;
    if (updateOnIntern == null) {
      updateOnIntern = false;
    }
    updateOnIntern = updateOnIntern || this.settings.updateOnIntern;
    if (entity.length && !entity._type) {
      entities = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = entity.length; _i < _len; _i++) {
          ent = entity[_i];
          _results.push(this.intern(ent, updateOnIntern));
        }
        return _results;
      }).call(this);
      return entities;
    }
    if (updateOnIntern) {
      ret = this._instances[entity._type()][entity.id()] || entity;
      _(ret._fields).extend(entity._fields);
    } else {
      ret = this._instances[entity._type()][entity.id()] || entity;
    }
    this._instances[entity._type()][entity.id()] = ret;
    return ret;
  },
  build: function(type, obj) {
    var def, demi, instance, r;
    def = this.definition(type);
    if (!def) {
      throw "JEFRi::Runtime::build '" + type + "' is not a defined type in this context.";
    }
    obj = obj || {};
    r = new def.Constructor(obj);
    if (def.key in obj) {
      demi = {
        _type: type
      };
      demi[def.key] = obj[def.key];
      instance = this.find(demi);
      if (instance.length > 0) {
        instance = instance[0];
        _(instance._fields).extend(r._fields);
        return instance;
      }
    }
    this._instances[type][r.id()] = r;
    return r;
  },
  expand: function(transaction, action) {
    var built, e, entity, _i, _len, _ref;
    action = action || "persisted";
    built = [];
    _ref = transaction.entities || [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      entity = _ref[_i];
      e = this.build(entity._type, entity);
      e = this.intern(e, true);
      e.trigger(action, true);
      built.push(e);
    }
    return transaction.entities = built;
  },
  destroy: function(entity) {
    delete this._instances[entity._type()][entity.id()];
    return this;
  },
  find: function(spec) {
    var key, r, result, results, to_return;
    if (typeof spec === "string") {
      spec = {
        _type: spec
      };
    }
    to_return = [];
    r = this.definition(spec._type);
    results = this._instances[spec._type];
    if (spec.hasOwnProperty(r.key || spec.hasOwnProperty('_id'))) {
      if (results[spec[r.key]]) {
        to_return.push(results[spec[r.key]]);
      }
    } else {
      for (key in results) {
        result = results[key];
        to_return.push(result);
      }
    }
    return to_return;
  }
});

JEFRi.Transaction = function(spec, store) {
  return _(this).extend({
    attributes: {},
    store: store,
    entities: spec instanceof Array ? spec : (spec ? [spec] : [])
  });
};

_(JEFRi.Transaction.prototype).extend({
  encode: function() {
    var entity, transaction, _i, _len, _ref;
    transaction = {
      attributes: this.attributes,
      entities: []
    };
    _ref = this.entities;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      entity = _ref[_i];
      transaction.entities.push(_.isEntity(entity) ? entity._encode() : entity);
    }
    return transaction;
  },
  toString: function() {
    return JSON.stringify(this.encode());
  },
  get: function(store) {
    var d;
    d = new _.Deferred();
    this.trigger("getting", {});
    store = store || this.store;
    return store.execute('get', this.then(!function() {
      return d.resolve(this);
    }).promise());
  },
  persist: function(store) {
    var d;
    d = _.Deferred();
    store = store || this.store;
    this.trigger("persisting", {});
    this.trigger("persisted", function(e, data) {});
    return store.execute('persist', this.then(!function(t) {
      var entity, _i, _len, _ref, _results;
      _ref = t.entities;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entity = _ref[_i];
        _results.push(entity.trigger("persisted", {}));
      }
      return _results;
    }).promise());
  },
  add: function(spec, force) {
    var s, _i, _len;
    if (force == null) {
      force = false;
    }
    spec = _.isArray(spec) ? spec : [].slice.call(arguments, 0);
    for (_i = 0, _len = spec.length; _i < _len; _i++) {
      s = spec[_i];
      if (force || _(this.entities).indexBy(JEFRi.EntityComparator(s)) < 0) {
        this.entities.push(s);
      }
    }
    return this;
  },
  attributes: function(attributes) {
    _(this.attributes).extend(attributes);
    return this;
  }
});

module.exports = JEFRi;
