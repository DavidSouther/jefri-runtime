/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var Runtime_1 = __webpack_require__(1);
	exports.Runtime = Runtime_1.Runtime;
	var jefri_1 = __webpack_require__(12);
	exports.isEntity = jefri_1.isEntity;
	var transaction_1 = __webpack_require__(13);
	exports.Transaction = transaction_1.Transaction;
	//# sourceMappingURL=index.js.map

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var events_1 = __webpack_require__(2);
	//import { UUID, request, lock } from 'jefri-jiffies';
	var jiffies = __webpack_require__(3);
	var UUID = jiffies.UUID, request = jiffies.request, lock = jiffies.lock;
	var jefri_1 = __webpack_require__(12);
	var Runtime = (function (_super) {
	    __extends(Runtime, _super);
	    function Runtime(contextUri, options, protos) {
	        var _this = this;
	        if (options === void 0) { options = {}; }
	        if (protos === void 0) { protos = {}; }
	        _super.call(this);
	        this.ready = null;
	        this.settings = {
	            updateOnIntern: true
	        };
	        this._context = {
	            meta: {},
	            contexts: {},
	            entities: {},
	            attributes: {}
	        };
	        this._instances = {};
	        var ready = { promise: null, reject: null, resolve: null };
	        this.ready = ready.promise = new Promise(function (resolve, reject) {
	            ready.resolve = resolve;
	            ready.reject = reject;
	        });
	        // Fill in all the privileged properties
	        Object.assign(this.settings, options);
	        if (contextUri !== '') {
	            this.load(contextUri, protos)
	                .then(function () { return ready.resolve(_this); }, function (e) { return ready.reject(e); });
	        }
	        else if (options.debug) {
	            this._set_context(options.debug.context, protos);
	            ready.resolve(this);
	        }
	    }
	    // #### Private helper functions
	    // These handle most of the heavy lifting of building Entity classes.
	    Runtime.prototype._default = function (type) {
	        switch (type) {
	            case "list": return [];
	            case "object": return {};
	            case "boolean": return false;
	            case "int":
	            case "float": return 0;
	            case "string":
	            default: return "";
	        }
	    };
	    // Takes a "raw" context object and orders it into the internal _context
	    // storage. Also builds constructors and prototypes for the context.
	    Runtime.prototype._set_context = function (context, protos) {
	        // Save the context-level attributes.
	        Object.assign(this._context.attributes, context.attributes || {});
	        // Prepare each entity type.
	        for (var type in context.entities) {
	            var definition = context.entities[type];
	            definition.type = type;
	            this._build_constructor(definition, type);
	        }
	    };
	    Runtime.prototype._build_constructor = function (definition, type) {
	        // Save a reference to the context, for constructors.
	        var EC = this;
	        this._context.entities[type] = definition;
	        this._instances[type] = {};
	        definition.Constructor = function (proto) {
	            if (proto === void 0) { proto = {}; }
	            // Set the entity key as early as possible.
	            proto[definition.key] = proto[definition.key] || UUID.v4();
	            var metadata = {
	                _new: true,
	                _modified: { _count: 0 },
	                _fields: {},
	                _relationships: {},
	                _runtime: EC
	            };
	            var events = new events_1.EventEmitter();
	            Object.defineProperties(this, {
	                _id: {
	                    configurable: false,
	                    enumerable: true,
	                    get: function () { return this[definition.key]; }
	                },
	                _definition: {
	                    configurable: false,
	                    enumerable: false,
	                    get: function () { return definition; }
	                },
	                _metadata: {
	                    configurable: false,
	                    enumerable: false,
	                    get: function () { return metadata; }
	                },
	                _events: {
	                    configurable: false,
	                    enumerable: false,
	                    get: function () { return events; }
	                },
	                _status: {
	                    configurable: false,
	                    enumerable: false,
	                    // Determine the status of the entity.
	                    get: function () {
	                        if (this._metadata._new) {
	                            return "NEW";
	                        }
	                        else if (this._metadata._modified._count === 0) {
	                            return "PERSISTED";
	                        }
	                        else {
	                            return "MODIFIED";
	                        }
	                    }
	                }
	            });
	            // Set a bunch of default values, so they're all available.
	            for (var name_1 in definition.properties) {
	                var property = definition.properties[name_1];
	                var dflt = proto[name_1] || EC._default(property.type);
	                this._metadata._fields[name_1] = dflt;
	            }
	        };
	        definition.Constructor.name = type;
	        // Set up the prototype for this entity.
	        this._build_prototype(type, definition);
	    };
	    Runtime.prototype._build_prototype = function (type, definition, protos) {
	        if (protos === void 0) { protos = {}; }
	        definition.Constructor.prototype = Object.create({
	            _type: function (full) {
	                if (full === void 0) { full = false; }
	                // Get the entity's type, possibly including the context name.
	                return type;
	            },
	            id: function (full) {
	                if (full === void 0) { full = false; }
	                // Return the id, possibly including the simple entity type.
	                var typePrefix = '';
	                if (full) {
	                    typePrefix = this._type() + '/';
	                }
	                return "" + typePrefix + this._id;
	            },
	            _equals: function (other) {
	                return jefri_1.EntityComparator(this, other);
	            },
	            _destroy: lock(function () {
	                this._events.emit('destroying');
	                for (var name_2 in Object.keys(definition.relationships)) {
	                    var rel = definition.relationships[name_2];
	                    try {
	                        this[name_2].remove(this);
	                    }
	                    catch (e) {
	                        this[name_2] = null;
	                    }
	                }
	                this[definition.key] = '';
	            })
	        });
	        for (var field in definition.properties) {
	            this._build_mutacc(definition, field, definition.properties[field]);
	        }
	        for (var field in definition.relationships) {
	            this._build_relationship(definition, field, definition.relationships[field]);
	        }
	        for (var field in definition.methods) {
	            this._build_method(definition, field, definition.methods[field]);
	        }
	    };
	    Runtime.prototype._build_mutacc = function (definition, field, property) {
	        Object.defineProperty(definition.Constructor.prototype, field, {
	            configurable: false,
	            enumerable: true,
	            get: function () { return this._metadata._fields[field]; },
	            set: function (value) {
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
	                this._events.emit('modified property', [field, value]);
	            }
	        });
	    };
	    Runtime.prototype._build_relationship = function (definition, field, relationship) {
	        var getter = null;
	        var setter = null;
	        if (relationship.type === 'has_many') {
	            var property = definition.properties[relationship.property];
	            if (property && property.type === 'list') {
	                getter = _has_many_list_get;
	                setter = function () { };
	            }
	            else {
	                getter = _has_many_get;
	                setter = function () { };
	            }
	        }
	        else {
	            getter = _has_one_get;
	            setter = _has_one_set();
	        }
	        Object.defineProperty(definition.Constructor.prototype, field, {
	            enumerable: false,
	            configurable: false,
	            get: getter,
	            set: setter
	        });
	        function _has_many_list_get() {
	            var _this = this;
	            this[relationship.property] = this[relationship.property] || [];
	            if (!this._metadata._relationships.hasOwnProperty(field)) {
	                // Create the EntityArray, and fill it from the list property IDs.
	                this._metadata._relationships[field] =
	                    new jefri_1.EntityArray(this, field, relationship);
	                this[relationship.property].forEach(function (id) {
	                    _this._metadata._relationships[field]
	                        .add(_this._metadata._runtime._instances[relationship.to.type][id]);
	                });
	                // Use the EntityArray events to maintain the accuracy of the ID list.
	                this._metadata._relationships[field]._events
	                    .on(jefri_1.EntityArray.ADD, function (e) {
	                    _this[relationship.property].push(e.id());
	                });
	                this._metadata._relationships[field]._events
	                    .on(jefri_1.EntityArray.REMOVE, function (e) {
	                    var i = _this[relationship.property].indexOf(e.id());
	                    _this[relationship.property].slice(i, 1);
	                });
	            }
	            return this._metadata._relationships[field];
	        }
	        function _has_many_get() {
	            var list = this._metadata._relationships[field];
	            if (!list) {
	                list = this._metadata._relationships[field] =
	                    new jefri_1.EntityArray(this, field, relationship);
	                for (var _i = 0, _a = this._metadata._runtime._instances[relationship.to.type]; _i < _a.length; _i++) {
	                    var id = _a[_i];
	                    var entity = this._metadata._runtime._instances[id];
	                    if (entity[relationship.to.property] == this[relationship.property]) {
	                        list.add(entity);
	                    }
	                }
	            }
	            return list;
	        }
	        function _has_one_get() {
	            if (!this._metadata._relationships[field]) {
	                // Try to find the entity
	                var instances = this._metadata._runtime._instances;
	                var instance = instances[relationship.to.type][this[relationship.property]];
	                if (!instance) {
	                    // We need to make one
	                    var key = (_a = {},
	                        _a[relationship.to.property] = this[relationship.property],
	                        _a
	                    );
	                    instance = this._metadata._runtime.build(relationship.to.type, key);
	                }
	                this[field] = instance;
	            }
	            return this._metadata._relationships[field];
	            var _a;
	        }
	        // Generate an accessor for a has_one relationship type.
	        // This accessor will return a single instance of the remote reference,
	        // and will follow appropriate back references.
	        //
	        // The local entity should have some string property whose value will match
	        // the remote entity's key property.
	        function _has_one_set() {
	            return lock(function (related) {
	                if (related === null) {
	                    // Actually a remove.
	                    related = this._metadata._relationships[field];
	                    if (related) {
	                        try {
	                            related[relationship.back].remove(this);
	                        }
	                        catch (e) {
	                            related[relationship.back] = null;
	                        }
	                    }
	                    this._metadata._relationships[field] = null;
	                    this[relationship.property] = null;
	                }
	                else {
	                    this._metadata._relationships[field] = related;
	                    _resolve_ids.call(this, related);
	                    if (relationship.back) {
	                        try {
	                            related[relationship.back].add(this);
	                        }
	                        catch (e) {
	                            related[relationship.back] = this;
	                        }
	                    }
	                }
	                this._events.emit('modified relationship', [field, related]);
	            });
	        }
	        function _resolve_ids(related) {
	            if (!related) {
	                this.relationship.property = void 0;
	            }
	            else if (definition.key === relationship.property) {
	                related[relationship.to.property] = this[relationship.property];
	            }
	            else if (related._definition.key === relationship.to.property) {
	                this[relationship.property] = related[relationship.to.property];
	            }
	            else {
	                if (this[relationship.to.property].match(UUID.rvalid)) {
	                    related[relationship.to.property] = this[relationship.to.property];
	                }
	                else if (related[relationship.to.property].match(UUID.rvalid)) {
	                    this[relationship.property] = related[relationship.to.property];
	                }
	                else {
	                    var id = UUID.v4();
	                    this[relationship.property] = id;
	                    related[relationship.to.property] = id;
	                }
	            }
	        }
	    };
	    Runtime.prototype._build_method = function (definition, field, method) {
	        method.definitions = method.definitions || {};
	        method.order = method.order || [];
	        var params = method.order;
	        var body = method.definitions['javascript'] || '';
	        var fn = function () { };
	        if (!body.match(/window/)) {
	            params.push(body);
	            fn = Function.apply(null, params);
	        }
	        definition.Constructor.prototype[field] = fn;
	    };
	    Runtime.prototype.build = function (entityType, obj) {
	        if (obj === void 0) { obj = {}; }
	        if (!this._context.entities[entityType]) {
	            throw new Error("JEFRi::Runtime::build '" + entityType + "' is not a defined type in this context.");
	        }
	        var definition = this.definition(entityType);
	        var entity = null;
	        if (definition && obj.hasOwnProperty(definition.key)) {
	        }
	        else {
	            entity = (new this._context.entities[entityType].Constructor(obj));
	            this._instances[entityType][entity.id()] = entity;
	        }
	        return entity;
	    };
	    Runtime.prototype.load = function (contextUri, protos) {
	        var _this = this;
	        if (protos === void 0) { protos = {}; }
	        return request(contextUri)
	            .then(function (data) {
	            _this._set_context(JSON.parse(data), protos);
	            return _this;
	        }).catch(function (e) {
	            console.error('Could not load context.');
	            console.warn(e);
	            console.log(e.stack);
	            throw e;
	        });
	    };
	    Runtime.prototype.clear = function () {
	        this._instances = {};
	        return this;
	    };
	    Runtime.prototype.definition = function (name) {
	        if (typeof name === 'string') {
	            return this._context.entities[name];
	        }
	        else {
	            return name._definition;
	        }
	    };
	    Runtime.prototype.extend = function (type, protos) { return this; };
	    Runtime.prototype.intern = function (entity, updateOnIntern) {
	        return entity;
	    };
	    Runtime.prototype.remove = function (entity) {
	        return this;
	    };
	    Runtime.prototype.find = function (spec) {
	        var rspec = null;
	        if (typeof spec === 'string') {
	            rspec = { _type: spec };
	        }
	        else {
	            rspec = spec;
	        }
	        var to_return = [];
	        var def = this.definition(rspec._type);
	        if (def.key in rspec || '_id' in rspec) {
	            var key = rspec[def.key] || rspec['_id'];
	            var e = this._instances[rspec._type][key];
	            if (e) {
	                to_return.push(e);
	            }
	        }
	        else {
	            for (var id in this._instances[rspec._type]) {
	                var e = this._instances[rspec._type][id];
	                var matches = true;
	                for (var key in rspec) {
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
	    };
	    return Runtime;
	})(events_1.EventEmitter);
	exports.Runtime = Runtime;
	//# sourceMappingURL=Runtime.js.map

/***/ },
/* 2 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var lock_1 = __webpack_require__(4);
	exports.lock = lock_1.lock;
	var request_1 = __webpack_require__(5);
	exports.request = request_1.request;
	var UUID_1 = __webpack_require__(9);
	exports.UUID = UUID_1.UUID;
	//# sourceMappingURL=index.js.map

/***/ },
/* 4 */
/***/ function(module, exports) {

	//const __locked: Symbol = Symbol('__locked');
	var __locked = '__locked';
	function lock(fn) {
	    return function () {
	        var args = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            args[_i - 0] = arguments[_i];
	        }
	        var ret = null;
	        var ex = null;
	        if (fn[__locked] !== true) {
	            fn[__locked] = true;
	            try {
	                ret = fn.apply(this, args);
	            }
	            catch (e) {
	                ex = e;
	            }
	        }
	        fn[__locked] = false;
	        if (ex !== null) {
	            throw ex;
	        }
	        else {
	            return ret;
	        }
	    };
	}
	exports.lock = lock;
	//# sourceMappingURL=lock.js.map

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var superagent = __webpack_require__(6);
	var req = function (uri) {
	    return get(uri);
	};
	req.get = get;
	req.post = post;
	exports.request = req;
	function get(uri) {
	    return new Promise(function (resolve, reject) {
	        return superagent.get(uri).end(function (err, _a) {
	            var ok = _a.ok, text = _a.text;
	            if (err != null) {
	                return reject(err);
	            }
	            else if (!ok) {
	                return reject(text);
	            }
	            else {
	                return resolve(text);
	            }
	        });
	    });
	}
	exports.get = get;
	function post(uri, options) {
	    var req = superagent.post(uri);
	    if (options.dataType) {
	        req.set('Content-type', options.dataType);
	    }
	    if (options.data) {
	        req.send(options.data);
	    }
	    return new Promise(function (resolve, reject) {
	        req.end(function (err, _a) {
	            var text = _a.text;
	            if (err != null) {
	                return reject(err);
	            }
	            else {
	                return resolve(text);
	            }
	        });
	    });
	}
	exports.post = post;
	//# sourceMappingURL=request.js.map

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Module dependencies.
	 */

	var Emitter = __webpack_require__(7);
	var reduce = __webpack_require__(8);

	/**
	 * Root reference for iframes.
	 */

	var root;
	if (typeof window !== 'undefined') { // Browser window
	  root = window;
	} else if (typeof self !== 'undefined') { // Web Worker
	  root = self;
	} else { // Other environments
	  root = this;
	}

	/**
	 * Noop.
	 */

	function noop(){};

	/**
	 * Check if `obj` is a host object,
	 * we don't want to serialize these :)
	 *
	 * TODO: future proof, move to compoent land
	 *
	 * @param {Object} obj
	 * @return {Boolean}
	 * @api private
	 */

	function isHost(obj) {
	  var str = {}.toString.call(obj);

	  switch (str) {
	    case '[object File]':
	    case '[object Blob]':
	    case '[object FormData]':
	      return true;
	    default:
	      return false;
	  }
	}

	/**
	 * Determine XHR.
	 */

	request.getXHR = function () {
	  if (root.XMLHttpRequest
	      && (!root.location || 'file:' != root.location.protocol
	          || !root.ActiveXObject)) {
	    return new XMLHttpRequest;
	  } else {
	    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
	    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
	    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
	    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
	  }
	  return false;
	};

	/**
	 * Removes leading and trailing whitespace, added to support IE.
	 *
	 * @param {String} s
	 * @return {String}
	 * @api private
	 */

	var trim = ''.trim
	  ? function(s) { return s.trim(); }
	  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

	/**
	 * Check if `obj` is an object.
	 *
	 * @param {Object} obj
	 * @return {Boolean}
	 * @api private
	 */

	function isObject(obj) {
	  return obj === Object(obj);
	}

	/**
	 * Serialize the given `obj`.
	 *
	 * @param {Object} obj
	 * @return {String}
	 * @api private
	 */

	function serialize(obj) {
	  if (!isObject(obj)) return obj;
	  var pairs = [];
	  for (var key in obj) {
	    if (null != obj[key]) {
	      pairs.push(encodeURIComponent(key)
	        + '=' + encodeURIComponent(obj[key]));
	    }
	  }
	  return pairs.join('&');
	}

	/**
	 * Expose serialization method.
	 */

	 request.serializeObject = serialize;

	 /**
	  * Parse the given x-www-form-urlencoded `str`.
	  *
	  * @param {String} str
	  * @return {Object}
	  * @api private
	  */

	function parseString(str) {
	  var obj = {};
	  var pairs = str.split('&');
	  var parts;
	  var pair;

	  for (var i = 0, len = pairs.length; i < len; ++i) {
	    pair = pairs[i];
	    parts = pair.split('=');
	    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
	  }

	  return obj;
	}

	/**
	 * Expose parser.
	 */

	request.parseString = parseString;

	/**
	 * Default MIME type map.
	 *
	 *     superagent.types.xml = 'application/xml';
	 *
	 */

	request.types = {
	  html: 'text/html',
	  json: 'application/json',
	  xml: 'application/xml',
	  urlencoded: 'application/x-www-form-urlencoded',
	  'form': 'application/x-www-form-urlencoded',
	  'form-data': 'application/x-www-form-urlencoded'
	};

	/**
	 * Default serialization map.
	 *
	 *     superagent.serialize['application/xml'] = function(obj){
	 *       return 'generated xml here';
	 *     };
	 *
	 */

	 request.serialize = {
	   'application/x-www-form-urlencoded': serialize,
	   'application/json': JSON.stringify
	 };

	 /**
	  * Default parsers.
	  *
	  *     superagent.parse['application/xml'] = function(str){
	  *       return { object parsed from str };
	  *     };
	  *
	  */

	request.parse = {
	  'application/x-www-form-urlencoded': parseString,
	  'application/json': JSON.parse
	};

	/**
	 * Parse the given header `str` into
	 * an object containing the mapped fields.
	 *
	 * @param {String} str
	 * @return {Object}
	 * @api private
	 */

	function parseHeader(str) {
	  var lines = str.split(/\r?\n/);
	  var fields = {};
	  var index;
	  var line;
	  var field;
	  var val;

	  lines.pop(); // trailing CRLF

	  for (var i = 0, len = lines.length; i < len; ++i) {
	    line = lines[i];
	    index = line.indexOf(':');
	    field = line.slice(0, index).toLowerCase();
	    val = trim(line.slice(index + 1));
	    fields[field] = val;
	  }

	  return fields;
	}

	/**
	 * Return the mime type for the given `str`.
	 *
	 * @param {String} str
	 * @return {String}
	 * @api private
	 */

	function type(str){
	  return str.split(/ *; */).shift();
	};

	/**
	 * Return header field parameters.
	 *
	 * @param {String} str
	 * @return {Object}
	 * @api private
	 */

	function params(str){
	  return reduce(str.split(/ *; */), function(obj, str){
	    var parts = str.split(/ *= */)
	      , key = parts.shift()
	      , val = parts.shift();

	    if (key && val) obj[key] = val;
	    return obj;
	  }, {});
	};

	/**
	 * Initialize a new `Response` with the given `xhr`.
	 *
	 *  - set flags (.ok, .error, etc)
	 *  - parse header
	 *
	 * Examples:
	 *
	 *  Aliasing `superagent` as `request` is nice:
	 *
	 *      request = superagent;
	 *
	 *  We can use the promise-like API, or pass callbacks:
	 *
	 *      request.get('/').end(function(res){});
	 *      request.get('/', function(res){});
	 *
	 *  Sending data can be chained:
	 *
	 *      request
	 *        .post('/user')
	 *        .send({ name: 'tj' })
	 *        .end(function(res){});
	 *
	 *  Or passed to `.send()`:
	 *
	 *      request
	 *        .post('/user')
	 *        .send({ name: 'tj' }, function(res){});
	 *
	 *  Or passed to `.post()`:
	 *
	 *      request
	 *        .post('/user', { name: 'tj' })
	 *        .end(function(res){});
	 *
	 * Or further reduced to a single call for simple cases:
	 *
	 *      request
	 *        .post('/user', { name: 'tj' }, function(res){});
	 *
	 * @param {XMLHTTPRequest} xhr
	 * @param {Object} options
	 * @api private
	 */

	function Response(req, options) {
	  options = options || {};
	  this.req = req;
	  this.xhr = this.req.xhr;
	  // responseText is accessible only if responseType is '' or 'text' and on older browsers
	  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
	     ? this.xhr.responseText
	     : null;
	  this.statusText = this.req.xhr.statusText;
	  this.setStatusProperties(this.xhr.status);
	  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
	  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
	  // getResponseHeader still works. so we get content-type even if getting
	  // other headers fails.
	  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
	  this.setHeaderProperties(this.header);
	  this.body = this.req.method != 'HEAD'
	    ? this.parseBody(this.text ? this.text : this.xhr.response)
	    : null;
	}

	/**
	 * Get case-insensitive `field` value.
	 *
	 * @param {String} field
	 * @return {String}
	 * @api public
	 */

	Response.prototype.get = function(field){
	  return this.header[field.toLowerCase()];
	};

	/**
	 * Set header related properties:
	 *
	 *   - `.type` the content type without params
	 *
	 * A response of "Content-Type: text/plain; charset=utf-8"
	 * will provide you with a `.type` of "text/plain".
	 *
	 * @param {Object} header
	 * @api private
	 */

	Response.prototype.setHeaderProperties = function(header){
	  // content-type
	  var ct = this.header['content-type'] || '';
	  this.type = type(ct);

	  // params
	  var obj = params(ct);
	  for (var key in obj) this[key] = obj[key];
	};

	/**
	 * Force given parser
	 * 
	 * Sets the body parser no matter type.
	 * 
	 * @param {Function}
	 * @api public
	 */

	Response.prototype.parse = function(fn){
	  this.parser = fn;
	  return this;
	};

	/**
	 * Parse the given body `str`.
	 *
	 * Used for auto-parsing of bodies. Parsers
	 * are defined on the `superagent.parse` object.
	 *
	 * @param {String} str
	 * @return {Mixed}
	 * @api private
	 */

	Response.prototype.parseBody = function(str){
	  var parse = this.parser || request.parse[this.type];
	  return parse && str && (str.length || str instanceof Object)
	    ? parse(str)
	    : null;
	};

	/**
	 * Set flags such as `.ok` based on `status`.
	 *
	 * For example a 2xx response will give you a `.ok` of __true__
	 * whereas 5xx will be __false__ and `.error` will be __true__. The
	 * `.clientError` and `.serverError` are also available to be more
	 * specific, and `.statusType` is the class of error ranging from 1..5
	 * sometimes useful for mapping respond colors etc.
	 *
	 * "sugar" properties are also defined for common cases. Currently providing:
	 *
	 *   - .noContent
	 *   - .badRequest
	 *   - .unauthorized
	 *   - .notAcceptable
	 *   - .notFound
	 *
	 * @param {Number} status
	 * @api private
	 */

	Response.prototype.setStatusProperties = function(status){
	  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
	  if (status === 1223) {
	    status = 204;
	  }

	  var type = status / 100 | 0;

	  // status / class
	  this.status = this.statusCode = status;
	  this.statusType = type;

	  // basics
	  this.info = 1 == type;
	  this.ok = 2 == type;
	  this.clientError = 4 == type;
	  this.serverError = 5 == type;
	  this.error = (4 == type || 5 == type)
	    ? this.toError()
	    : false;

	  // sugar
	  this.accepted = 202 == status;
	  this.noContent = 204 == status;
	  this.badRequest = 400 == status;
	  this.unauthorized = 401 == status;
	  this.notAcceptable = 406 == status;
	  this.notFound = 404 == status;
	  this.forbidden = 403 == status;
	};

	/**
	 * Return an `Error` representative of this response.
	 *
	 * @return {Error}
	 * @api public
	 */

	Response.prototype.toError = function(){
	  var req = this.req;
	  var method = req.method;
	  var url = req.url;

	  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
	  var err = new Error(msg);
	  err.status = this.status;
	  err.method = method;
	  err.url = url;

	  return err;
	};

	/**
	 * Expose `Response`.
	 */

	request.Response = Response;

	/**
	 * Initialize a new `Request` with the given `method` and `url`.
	 *
	 * @param {String} method
	 * @param {String} url
	 * @api public
	 */

	function Request(method, url) {
	  var self = this;
	  Emitter.call(this);
	  this._query = this._query || [];
	  this.method = method;
	  this.url = url;
	  this.header = {};
	  this._header = {};
	  this.on('end', function(){
	    var err = null;
	    var res = null;

	    try {
	      res = new Response(self);
	    } catch(e) {
	      err = new Error('Parser is unable to parse the response');
	      err.parse = true;
	      err.original = e;
	      return self.callback(err);
	    }

	    self.emit('response', res);

	    if (err) {
	      return self.callback(err, res);
	    }

	    if (res.status >= 200 && res.status < 300) {
	      return self.callback(err, res);
	    }

	    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
	    new_err.original = err;
	    new_err.response = res;
	    new_err.status = res.status;

	    self.callback(new_err, res);
	  });
	}

	/**
	 * Mixin `Emitter`.
	 */

	Emitter(Request.prototype);

	/**
	 * Allow for extension
	 */

	Request.prototype.use = function(fn) {
	  fn(this);
	  return this;
	}

	/**
	 * Set timeout to `ms`.
	 *
	 * @param {Number} ms
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.timeout = function(ms){
	  this._timeout = ms;
	  return this;
	};

	/**
	 * Clear previous timeout.
	 *
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.clearTimeout = function(){
	  this._timeout = 0;
	  clearTimeout(this._timer);
	  return this;
	};

	/**
	 * Abort the request, and clear potential timeout.
	 *
	 * @return {Request}
	 * @api public
	 */

	Request.prototype.abort = function(){
	  if (this.aborted) return;
	  this.aborted = true;
	  this.xhr.abort();
	  this.clearTimeout();
	  this.emit('abort');
	  return this;
	};

	/**
	 * Set header `field` to `val`, or multiple fields with one object.
	 *
	 * Examples:
	 *
	 *      req.get('/')
	 *        .set('Accept', 'application/json')
	 *        .set('X-API-Key', 'foobar')
	 *        .end(callback);
	 *
	 *      req.get('/')
	 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
	 *        .end(callback);
	 *
	 * @param {String|Object} field
	 * @param {String} val
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.set = function(field, val){
	  if (isObject(field)) {
	    for (var key in field) {
	      this.set(key, field[key]);
	    }
	    return this;
	  }
	  this._header[field.toLowerCase()] = val;
	  this.header[field] = val;
	  return this;
	};

	/**
	 * Remove header `field`.
	 *
	 * Example:
	 *
	 *      req.get('/')
	 *        .unset('User-Agent')
	 *        .end(callback);
	 *
	 * @param {String} field
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.unset = function(field){
	  delete this._header[field.toLowerCase()];
	  delete this.header[field];
	  return this;
	};

	/**
	 * Get case-insensitive header `field` value.
	 *
	 * @param {String} field
	 * @return {String}
	 * @api private
	 */

	Request.prototype.getHeader = function(field){
	  return this._header[field.toLowerCase()];
	};

	/**
	 * Set Content-Type to `type`, mapping values from `request.types`.
	 *
	 * Examples:
	 *
	 *      superagent.types.xml = 'application/xml';
	 *
	 *      request.post('/')
	 *        .type('xml')
	 *        .send(xmlstring)
	 *        .end(callback);
	 *
	 *      request.post('/')
	 *        .type('application/xml')
	 *        .send(xmlstring)
	 *        .end(callback);
	 *
	 * @param {String} type
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.type = function(type){
	  this.set('Content-Type', request.types[type] || type);
	  return this;
	};

	/**
	 * Set Accept to `type`, mapping values from `request.types`.
	 *
	 * Examples:
	 *
	 *      superagent.types.json = 'application/json';
	 *
	 *      request.get('/agent')
	 *        .accept('json')
	 *        .end(callback);
	 *
	 *      request.get('/agent')
	 *        .accept('application/json')
	 *        .end(callback);
	 *
	 * @param {String} accept
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.accept = function(type){
	  this.set('Accept', request.types[type] || type);
	  return this;
	};

	/**
	 * Set Authorization field value with `user` and `pass`.
	 *
	 * @param {String} user
	 * @param {String} pass
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.auth = function(user, pass){
	  var str = btoa(user + ':' + pass);
	  this.set('Authorization', 'Basic ' + str);
	  return this;
	};

	/**
	* Add query-string `val`.
	*
	* Examples:
	*
	*   request.get('/shoes')
	*     .query('size=10')
	*     .query({ color: 'blue' })
	*
	* @param {Object|String} val
	* @return {Request} for chaining
	* @api public
	*/

	Request.prototype.query = function(val){
	  if ('string' != typeof val) val = serialize(val);
	  if (val) this._query.push(val);
	  return this;
	};

	/**
	 * Write the field `name` and `val` for "multipart/form-data"
	 * request bodies.
	 *
	 * ``` js
	 * request.post('/upload')
	 *   .field('foo', 'bar')
	 *   .end(callback);
	 * ```
	 *
	 * @param {String} name
	 * @param {String|Blob|File} val
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.field = function(name, val){
	  if (!this._formData) this._formData = new root.FormData();
	  this._formData.append(name, val);
	  return this;
	};

	/**
	 * Queue the given `file` as an attachment to the specified `field`,
	 * with optional `filename`.
	 *
	 * ``` js
	 * request.post('/upload')
	 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
	 *   .end(callback);
	 * ```
	 *
	 * @param {String} field
	 * @param {Blob|File} file
	 * @param {String} filename
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.attach = function(field, file, filename){
	  if (!this._formData) this._formData = new root.FormData();
	  this._formData.append(field, file, filename);
	  return this;
	};

	/**
	 * Send `data`, defaulting the `.type()` to "json" when
	 * an object is given.
	 *
	 * Examples:
	 *
	 *       // querystring
	 *       request.get('/search')
	 *         .end(callback)
	 *
	 *       // multiple data "writes"
	 *       request.get('/search')
	 *         .send({ search: 'query' })
	 *         .send({ range: '1..5' })
	 *         .send({ order: 'desc' })
	 *         .end(callback)
	 *
	 *       // manual json
	 *       request.post('/user')
	 *         .type('json')
	 *         .send('{"name":"tj"})
	 *         .end(callback)
	 *
	 *       // auto json
	 *       request.post('/user')
	 *         .send({ name: 'tj' })
	 *         .end(callback)
	 *
	 *       // manual x-www-form-urlencoded
	 *       request.post('/user')
	 *         .type('form')
	 *         .send('name=tj')
	 *         .end(callback)
	 *
	 *       // auto x-www-form-urlencoded
	 *       request.post('/user')
	 *         .type('form')
	 *         .send({ name: 'tj' })
	 *         .end(callback)
	 *
	 *       // defaults to x-www-form-urlencoded
	  *      request.post('/user')
	  *        .send('name=tobi')
	  *        .send('species=ferret')
	  *        .end(callback)
	 *
	 * @param {String|Object} data
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.send = function(data){
	  var obj = isObject(data);
	  var type = this.getHeader('Content-Type');

	  // merge
	  if (obj && isObject(this._data)) {
	    for (var key in data) {
	      this._data[key] = data[key];
	    }
	  } else if ('string' == typeof data) {
	    if (!type) this.type('form');
	    type = this.getHeader('Content-Type');
	    if ('application/x-www-form-urlencoded' == type) {
	      this._data = this._data
	        ? this._data + '&' + data
	        : data;
	    } else {
	      this._data = (this._data || '') + data;
	    }
	  } else {
	    this._data = data;
	  }

	  if (!obj || isHost(data)) return this;
	  if (!type) this.type('json');
	  return this;
	};

	/**
	 * Invoke the callback with `err` and `res`
	 * and handle arity check.
	 *
	 * @param {Error} err
	 * @param {Response} res
	 * @api private
	 */

	Request.prototype.callback = function(err, res){
	  var fn = this._callback;
	  this.clearTimeout();
	  fn(err, res);
	};

	/**
	 * Invoke callback with x-domain error.
	 *
	 * @api private
	 */

	Request.prototype.crossDomainError = function(){
	  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
	  err.crossDomain = true;
	  this.callback(err);
	};

	/**
	 * Invoke callback with timeout error.
	 *
	 * @api private
	 */

	Request.prototype.timeoutError = function(){
	  var timeout = this._timeout;
	  var err = new Error('timeout of ' + timeout + 'ms exceeded');
	  err.timeout = timeout;
	  this.callback(err);
	};

	/**
	 * Enable transmission of cookies with x-domain requests.
	 *
	 * Note that for this to work the origin must not be
	 * using "Access-Control-Allow-Origin" with a wildcard,
	 * and also must set "Access-Control-Allow-Credentials"
	 * to "true".
	 *
	 * @api public
	 */

	Request.prototype.withCredentials = function(){
	  this._withCredentials = true;
	  return this;
	};

	/**
	 * Initiate request, invoking callback `fn(res)`
	 * with an instanceof `Response`.
	 *
	 * @param {Function} fn
	 * @return {Request} for chaining
	 * @api public
	 */

	Request.prototype.end = function(fn){
	  var self = this;
	  var xhr = this.xhr = request.getXHR();
	  var query = this._query.join('&');
	  var timeout = this._timeout;
	  var data = this._formData || this._data;

	  // store callback
	  this._callback = fn || noop;

	  // state change
	  xhr.onreadystatechange = function(){
	    if (4 != xhr.readyState) return;

	    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
	    // result in the error "Could not complete the operation due to error c00c023f"
	    var status;
	    try { status = xhr.status } catch(e) { status = 0; }

	    if (0 == status) {
	      if (self.timedout) return self.timeoutError();
	      if (self.aborted) return;
	      return self.crossDomainError();
	    }
	    self.emit('end');
	  };

	  // progress
	  var handleProgress = function(e){
	    if (e.total > 0) {
	      e.percent = e.loaded / e.total * 100;
	    }
	    self.emit('progress', e);
	  };
	  if (this.hasListeners('progress')) {
	    xhr.onprogress = handleProgress;
	  }
	  try {
	    if (xhr.upload && this.hasListeners('progress')) {
	      xhr.upload.onprogress = handleProgress;
	    }
	  } catch(e) {
	    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
	    // Reported here:
	    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
	  }

	  // timeout
	  if (timeout && !this._timer) {
	    this._timer = setTimeout(function(){
	      self.timedout = true;
	      self.abort();
	    }, timeout);
	  }

	  // querystring
	  if (query) {
	    query = request.serializeObject(query);
	    this.url += ~this.url.indexOf('?')
	      ? '&' + query
	      : '?' + query;
	  }

	  // initiate request
	  xhr.open(this.method, this.url, true);

	  // CORS
	  if (this._withCredentials) xhr.withCredentials = true;

	  // body
	  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
	    // serialize stuff
	    var contentType = this.getHeader('Content-Type');
	    var serialize = request.serialize[contentType ? contentType.split(';')[0] : ''];
	    if (serialize) data = serialize(data);
	  }

	  // set header fields
	  for (var field in this.header) {
	    if (null == this.header[field]) continue;
	    xhr.setRequestHeader(field, this.header[field]);
	  }

	  // send stuff
	  this.emit('request', this);
	  xhr.send(data);
	  return this;
	};

	/**
	 * Faux promise support
	 *
	 * @param {Function} fulfill
	 * @param {Function} reject
	 * @return {Request}
	 */

	Request.prototype.then = function (fulfill, reject) {
	  return this.end(function(err, res) {
	    err ? reject(err) : fulfill(res);
	  });
	}

	/**
	 * Expose `Request`.
	 */

	request.Request = Request;

	/**
	 * Issue a request:
	 *
	 * Examples:
	 *
	 *    request('GET', '/users').end(callback)
	 *    request('/users').end(callback)
	 *    request('/users', callback)
	 *
	 * @param {String} method
	 * @param {String|Function} url or callback
	 * @return {Request}
	 * @api public
	 */

	function request(method, url) {
	  // callback
	  if ('function' == typeof url) {
	    return new Request('GET', method).end(url);
	  }

	  // url first
	  if (1 == arguments.length) {
	    return new Request('GET', method);
	  }

	  return new Request(method, url);
	}

	/**
	 * GET `url` with optional callback `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Mixed|Function} data or fn
	 * @param {Function} fn
	 * @return {Request}
	 * @api public
	 */

	request.get = function(url, data, fn){
	  var req = request('GET', url);
	  if ('function' == typeof data) fn = data, data = null;
	  if (data) req.query(data);
	  if (fn) req.end(fn);
	  return req;
	};

	/**
	 * HEAD `url` with optional callback `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Mixed|Function} data or fn
	 * @param {Function} fn
	 * @return {Request}
	 * @api public
	 */

	request.head = function(url, data, fn){
	  var req = request('HEAD', url);
	  if ('function' == typeof data) fn = data, data = null;
	  if (data) req.send(data);
	  if (fn) req.end(fn);
	  return req;
	};

	/**
	 * DELETE `url` with optional callback `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Function} fn
	 * @return {Request}
	 * @api public
	 */

	request.del = function(url, fn){
	  var req = request('DELETE', url);
	  if (fn) req.end(fn);
	  return req;
	};

	/**
	 * PATCH `url` with optional `data` and callback `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Mixed} data
	 * @param {Function} fn
	 * @return {Request}
	 * @api public
	 */

	request.patch = function(url, data, fn){
	  var req = request('PATCH', url);
	  if ('function' == typeof data) fn = data, data = null;
	  if (data) req.send(data);
	  if (fn) req.end(fn);
	  return req;
	};

	/**
	 * POST `url` with optional `data` and callback `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Mixed} data
	 * @param {Function} fn
	 * @return {Request}
	 * @api public
	 */

	request.post = function(url, data, fn){
	  var req = request('POST', url);
	  if ('function' == typeof data) fn = data, data = null;
	  if (data) req.send(data);
	  if (fn) req.end(fn);
	  return req;
	};

	/**
	 * PUT `url` with optional `data` and callback `fn(res)`.
	 *
	 * @param {String} url
	 * @param {Mixed|Function} data or fn
	 * @param {Function} fn
	 * @return {Request}
	 * @api public
	 */

	request.put = function(url, data, fn){
	  var req = request('PUT', url);
	  if ('function' == typeof data) fn = data, data = null;
	  if (data) req.send(data);
	  if (fn) req.end(fn);
	  return req;
	};

	/**
	 * Expose `request`.
	 */

	module.exports = request;


/***/ },
/* 7 */
/***/ function(module, exports) {

	
	/**
	 * Expose `Emitter`.
	 */

	module.exports = Emitter;

	/**
	 * Initialize a new `Emitter`.
	 *
	 * @api public
	 */

	function Emitter(obj) {
	  if (obj) return mixin(obj);
	};

	/**
	 * Mixin the emitter properties.
	 *
	 * @param {Object} obj
	 * @return {Object}
	 * @api private
	 */

	function mixin(obj) {
	  for (var key in Emitter.prototype) {
	    obj[key] = Emitter.prototype[key];
	  }
	  return obj;
	}

	/**
	 * Listen on the given `event` with `fn`.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.on =
	Emitter.prototype.addEventListener = function(event, fn){
	  this._callbacks = this._callbacks || {};
	  (this._callbacks[event] = this._callbacks[event] || [])
	    .push(fn);
	  return this;
	};

	/**
	 * Adds an `event` listener that will be invoked a single
	 * time then automatically removed.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.once = function(event, fn){
	  var self = this;
	  this._callbacks = this._callbacks || {};

	  function on() {
	    self.off(event, on);
	    fn.apply(this, arguments);
	  }

	  on.fn = fn;
	  this.on(event, on);
	  return this;
	};

	/**
	 * Remove the given callback for `event` or all
	 * registered callbacks.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.off =
	Emitter.prototype.removeListener =
	Emitter.prototype.removeAllListeners =
	Emitter.prototype.removeEventListener = function(event, fn){
	  this._callbacks = this._callbacks || {};

	  // all
	  if (0 == arguments.length) {
	    this._callbacks = {};
	    return this;
	  }

	  // specific event
	  var callbacks = this._callbacks[event];
	  if (!callbacks) return this;

	  // remove all handlers
	  if (1 == arguments.length) {
	    delete this._callbacks[event];
	    return this;
	  }

	  // remove specific handler
	  var cb;
	  for (var i = 0; i < callbacks.length; i++) {
	    cb = callbacks[i];
	    if (cb === fn || cb.fn === fn) {
	      callbacks.splice(i, 1);
	      break;
	    }
	  }
	  return this;
	};

	/**
	 * Emit `event` with the given args.
	 *
	 * @param {String} event
	 * @param {Mixed} ...
	 * @return {Emitter}
	 */

	Emitter.prototype.emit = function(event){
	  this._callbacks = this._callbacks || {};
	  var args = [].slice.call(arguments, 1)
	    , callbacks = this._callbacks[event];

	  if (callbacks) {
	    callbacks = callbacks.slice(0);
	    for (var i = 0, len = callbacks.length; i < len; ++i) {
	      callbacks[i].apply(this, args);
	    }
	  }

	  return this;
	};

	/**
	 * Return array of callbacks for `event`.
	 *
	 * @param {String} event
	 * @return {Array}
	 * @api public
	 */

	Emitter.prototype.listeners = function(event){
	  this._callbacks = this._callbacks || {};
	  return this._callbacks[event] || [];
	};

	/**
	 * Check if this emitter has `event` handlers.
	 *
	 * @param {String} event
	 * @return {Boolean}
	 * @api public
	 */

	Emitter.prototype.hasListeners = function(event){
	  return !! this.listeners(event).length;
	};


/***/ },
/* 8 */
/***/ function(module, exports) {

	
	/**
	 * Reduce `arr` with `fn`.
	 *
	 * @param {Array} arr
	 * @param {Function} fn
	 * @param {Mixed} initial
	 *
	 * TODO: combatible error handling?
	 */

	module.exports = function(arr, fn, initial){  
	  var idx = 0;
	  var len = arr.length;
	  var curr = arguments.length == 3
	    ? initial
	    : arr[idx++];

	  while (idx < len) {
	    curr = fn.call(null, curr, arr[idx], ++idx, arr);
	  }
	  
	  return curr;
	};

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var index_1 = __webpack_require__(10);
	exports.UUID = {
	    rvalid: /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i,
	    v4: function () {
	        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
	            var r = index_1.randomByte() & 0x0f;
	            return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
	        });
	    }
	};
	//# sourceMappingURL=UUID.js.map

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var server_1 = __webpack_require__(11);
	function randomByte() {
	    var array = server_1.getUint8Array(1);
	    return [].slice.call(array)[0];
	}
	exports.randomByte = randomByte;
	//# sourceMappingURL=index.js.map

/***/ },
/* 11 */
/***/ function(module, exports) {

	function getUint8Array(size) {
	    var array = new Uint8Array(size);
	    window.crypto.getRandomValues(array);
	    return array;
	}
	exports.getUint8Array = getUint8Array;
	;
	//# sourceMappingURL=browser.js.map

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	function EntityComparator(a, b) {
	    return a && b && a._type() === b._type() && a.id() === b.id();
	}
	exports.EntityComparator = EntityComparator;
	function isEntity(obj) {
	    // Duck type check if an object is an entity.
	    return obj && typeof obj._type == "function" && typeof obj.id == "function"
	        || false;
	}
	exports.isEntity = isEntity;
	var events_1 = __webpack_require__(2);
	var EntityArray = (function (_super) {
	    __extends(EntityArray, _super);
	    function EntityArray(entity, field, relationship, _events) {
	        if (_events === void 0) { _events = new events_1.EventEmitter(); }
	        _super.call(this);
	        this.entity = entity;
	        this.field = field;
	        this.relationship = relationship;
	        this._events = _events;
	    }
	    EntityArray.prototype.remove = function (entity) {
	        if (entity === null) {
	            return this;
	        }
	        var i = this.length - 1;
	        while (i >= 0) {
	            if (this[i]._equals(entity)) {
	                if (this.relationship.back) {
	                    var e = this[i];
	                    try {
	                        e[this.relationship.back].remove(this);
	                    }
	                    catch (err) {
	                        e[this.relationship.back] = null;
	                    }
	                }
	                this.splice(i, 1);
	            }
	            i -= 1;
	        }
	        this._events.emit(EntityArray.REMOVE, entity);
	        return this;
	    };
	    EntityArray.prototype.add = function (entity) {
	        var _this = this;
	        if (entity instanceof Array) {
	            entity.map(function (e) { return _this.add(e); });
	        }
	        else {
	            var found = this.entity[this.field]
	                .filter(function (e) { return EntityComparator(e, entity); }).length > 0;
	            if (!found) {
	                this.push(entity);
	                if (this.relationship.back) {
	                    entity[this.relationship.back] = this.entity;
	                }
	                this._events.emit(EntityArray.ADD, entity);
	            }
	        }
	        return this;
	    };
	    EntityArray.ADD = 'add';
	    EntityArray.REMOVE = 'remove';
	    return EntityArray;
	})(Array);
	exports.EntityArray = EntityArray;
	//# sourceMappingURL=jefri.js.map

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var events_1 = __webpack_require__(2);
	var Transaction = (function (_super) {
	    __extends(Transaction, _super);
	    function Transaction(spec, store) {
	        if (spec === void 0) { spec = {}; }
	        if (store === void 0) { store = null; }
	        _super.call(this);
	        this.store = store;
	        this.attributes = {};
	        this.entities = [];
	        this.attributes = spec.attributes || {};
	        this.add(spec.entities || []);
	    }
	    Transaction.prototype.encode = function () {
	        var transaction = {
	            attributes: this.attributes,
	            entities: []
	        };
	        for (var entity in this.entities) {
	            if (typeof entity._encode === 'function') {
	                transaction.entities.push(entity._encode());
	            }
	            else {
	                transaction.entities.push(entity);
	            }
	        }
	        return transaction;
	    };
	    Transaction.prototype.toString = function () {
	        return JSON.stringify(this.encode());
	    };
	    Transaction.prototype.get = function (store) {
	        var _this = this;
	        if (store === void 0) { store = this.store; }
	        this.emit('getting');
	        return store.execute(JEFRi.StoreExecutionType.get, this)
	            .then(function () { return Promise.resolve(_this); });
	    };
	    Transaction.prototype.persist = function (store) {
	        var _this = this;
	        if (store === void 0) { store = this.store; }
	        this.emit('persisting');
	        return store.execute(JEFRi.StoreExecutionType.persist, this)
	            .then(function (t) {
	            for (var entity in t.entities) {
	                if (entity._events) {
	                    entity._events.emit('persisted');
	                }
	            }
	            return Promise.resolve(_this);
	        });
	    };
	    Transaction.prototype.add = function (entities) {
	        this.entities = this.entities.concat(entities);
	        return this;
	    };
	    Transaction.prototype.setAttributes = function (attrs) {
	        Object.assign(this.attributes, attrs);
	        return this;
	    };
	    return Transaction;
	})(events_1.EventEmitter);
	exports.Transaction = Transaction;
	//# sourceMappingURL=transaction.js.map

/***/ }
/******/ ]);