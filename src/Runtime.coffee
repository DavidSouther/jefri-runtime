#	 JEFRi Runtime.js
#	 (c) 2011-2015 David Souther
#	 JEFRi is freely distributable under the MIT license.
#	 For all details and documentation:
#	 http://jefri.org

JEFRi = require('./jefri')
jiffies = require('jefri-jiffies')

Eventer = jiffies.Event
Promise = jiffies.promise
UUID = jiffies.UUID
lock = jiffies.lock

EntityArray = require './entityarray'

# ### Runtime Constructor
module.exports = JEFRi.Runtime = (contextUri, options, protos) ->
	if not @ instanceof JEFRi.Runtime
		return new JEFRi.Rutime contextUri, options, protos

	# The ec reference for entity prototypes
	ec = @

	unless Object.isString(contextUri)
		protos = options
		options = contextUri
		contextUri = ''

	# Prepare a promise for completing context loading.
	ready = Promise.defer()

	# # Fill in all the privileged properties
	# settings =
	# 	# If an entity already exists, does JEFRi update or replace?
	# 	updateOnIntern: true
	# 	# The constructor for the default store.
	# Object.assign settings, options

	# Object.assign @,
	# 	settings: settings
	#
	# 	ready: ready.promise
	#
	# 	# In-memory representation of the loaded context.
	# 	_context:
	# 		meta: {}
	# 		contexts: {}
	# 		entities: {}
	# 		attributes: {}
	#
	# 	# In-memory store of JEFRi entities.
	# 	_instances: {}

	# #### Private helper functions
	# These handle most of the heavy lifting of building Entity classes.

	# # A few default property values.
	# _default = (type) ->
	# 	switch type
	# 		when "list" then []
	# 		when "object" then {}
	# 		when "boolean" then false
	# 		when "int" or "float" then 0
	# 		when "string" then ""
	# 		else ""

	# # Takes a "raw" context object and orders it into the internal _context
	# # storage. Also builds constructors and prototypes for the context.
	# _set_context = (context, protos) =>
	# 	# Save the attributes
	# 	Object.assign @_context.attributes, context.attributes or {}
	#
	# 	# Prepare each entity. Uses _.each to put (definition, type) in a closure.
	# 	# _.each context.entities, (definition, type) => # NO SERIOUSLY, definition MUST BE IN A CLOSURE!
	# 	for type, definition of context.entities
	# 		definition.type = type
	# 		_build_constructor definition, type

	# _build_constructor = (definition, type) =>
	# 	# Keep the definition locally, modifying it directly with the ctor and prototypes.
	# 	@_context.entities[type] = definition
	# 	# Ready the instances bucket
	# 	@_instances[type] = {}
	#
	# 	# Build an entity's constructor.
	# 	definition.Constructor = (proto) ->
	# 		# Set the privileged accounting and property data.
	# 		Object.assign @,
	# 			_new: true
	# 			_modified: {_count: 0}
	# 			_fields: {}
	# 			_relationships: {}
	# 			_runtime: ec
	#
	# 		# Check for runtime prototype override.
	# 		proto = proto || {}

			# # Set the key, generate if not set by proto.
			# proto[definition.key] or= UUID.v4()

			# # Set a bunch of default values, so they're all available.
			# for name, property of definition.properties
			# 	# Use the value provided to the constructor, or the default.
			# 	def = proto[name] || _default(property.type)
			# 	@[name] = def
			#
			# # Attach a privileged copy of the full id, more for debugging than use.
			# @_id = @id true

			# Add runtime methods //?
			# Object.assign @::, proto::

			# Set a few event handlers
			# Manage accounting after an entity has been persisted
			@.on "persisted", ->
				@_new = false
				@_modified = {_count: 0}

			return @

		# # definition.Constructor.name = type
		#
		# #Set up the prototype for any of this entity.
		# _build_prototype(type, definition, (protos && protos[type]) )

	# Set up all the required methods - id!, _type!, and the mutaccs.
	# _build_prototype = (type, definition, proto) =>
		# definition.Constructor:: = Object.create Object.assign {}, Eventer::,
			# # Get this entity's type. Use the closure'd reference.
			# _type: (full) ->
			# 	full = full || false
			# 	type
			#
			# # Get this entity's ID.
			# id: (full) ->
			# 	"#{if full then "#{@_type()}/" else ""}#{@[definition.key]}"

			# Find the status of an entity.
			_status: ->
				if @_new
					"NEW"
				else if @_modified._count is 0
					"PERSISTED"
				else
					"MODIFIED"

			# _definition: -> definition

			# Add this entity to the persist transaction
			_persist: (transaction, callback) ->
				deferred = _.Deferred().then(callback)

				top = !transaction
				transaction = if top then new JEFRi.Transaction() else transaction
				transaction.add(@)

				#Call the on_persist handler
				@emit "persisting", transaction

				#If we're on top, run the transaction...
				if top then transaction.persist(callback)

				# deferred.promise()

			# Encode returns the bare object.
			_encode: ->
				min = {_type: @_type(), _id: @id() }

				#Add all the properties to the writer.
				for prop of definition.properties
					min[prop] = @[prop]

				# Don't add relationships. Any walker will be responsible for adding only the entities they need.
				min

			# Delete this entity.
			# Remove it from all relationships, invalidate the ID.
			_destroy: lock ->
				@emit "destroying", {}
				for name, rel of definition.relationships
					if rel.type is "has_many"
						@[name].remove @
					else
						@[name] = null
				ec.destroy @
				@[definition.key] = 0
				@emit "destroyed", {}

			# _compare: (b) ->
			# 	JEFRi.EntityComparator @, b

		# Alias _encode as toJSON for ES5 JSON.stringify()
		definition.Constructor::toJSON = definition.Constructor::_encode

		# Prepare property mutators and accessors.
		for field, property of definition.properties
			_build_mutacc definition, field, property

		# Prepare navigation mutaccs.
		for rel_name, relationship of definition.relationships
			_build_relationship definition, rel_name, relationship

		for method, func of definition.methods
			_build_method definition, method, func

		# Add any additional prototypes functions
		if proto then Object.assign definition.Constructor::, proto::

	# Prepare a mutacc for a specific property.
	# The property mutacc must handle entity accounting details.
	_build_mutacc = (definition, field, property) =>
		Object.defineProperty definition.Constructor::, field,
			# The setter has some accounting details to handle
			set: (value) ->
				# Only actually update it if it is a new value.
				if (value isnt @_fields[field])
					# The actual set
					@_fields[field] = value

					# Update the modified list if not set...
					if (!@_modified[field])
						@_modified[field] = @_fields[field]
						@_modified._count += 1
					else
						# It might be getting set to the old value...
						if (@_modified[field] is value)
							delete @_modified[field]
							@_modified._count -= 1

					# Notify observers
					@emit "modified", [field, value]

			get: ->
				# Just a getter.
				return @_fields[field]

	# Attach the mutators and accessors (mutaccs) to the prototype.
	_build_relationship = (definition, field, relationship) ->
		# Generate an accessor for a has_one relationship type.
		# This accessor will return a single instance of the remote reference,
		# and will follow appropriate back references.
		#
		# The local entity should have some string property whose value will match
		# the remote entity's key property.
		_has_one = ->
			set: lock (related) ->
				if related is null # Actually a "Remove"
					if "is_a" isnt relationship.type
						try
							@_relationships[field]?[relationship.back].remove @
						catch
							@_relationships[field]?[relationship.back] = null
					@_relationships[field] = null
					@[relationship.property] = null
				else # A set
					@_relationships[field] = related
					resolve_ids.call @, related
					if "is_a" isnt relationship.type
						if relationship.back then related?[relationship.back] = @
				# Notify observers
				@_modified._count += 1
				@emit "modified", [field, related]
				@

			get: ->
				if @_relationships[field] is undefined
					# Just need the one...
					@_relationships[field] = ec._instances[relationship.to.type][@[relationship.property]]
					# Make sure we found one
					if @_relationships[field] is undefined
						# If not, create it.
						key = {}
						key[relationship.to.property] = @[relationship.property]
						@[field] = ec.build(relationship.to.type, key)

				return @_relationships[field]

		# Generate an accessor for a many to one relationship, where a single
		# remote entity's property matches the local entitie's key.
		_has_many = ->
			enumerable: true
			configurable: false
			# Return the set of entities in the relationship.
			get: ->
				# Check if the field has ever been set
				if not (field of @_relationships)
					# The field hasn't been set, so we haven't ever gotten this relationship before.
					@_relationships[field] = new EntityArray @, field, relationship
					# We'll need to go through and fix that.
					# We'll need to grab everything who points to us...
					# Loop over every entity this relationship could point to
					for id, type of ec._instances[relationship.to.type]
						# If these are related
						if type[relationship.to.property] is @[relationship.property]
							# Add it
							@_relationships[field].add type
				@_relationships[field]

			# Add an entity to the relationship.
			set: (relations...) ->
				relations = relations.reduce(((a, b)->a.concat(b)), [])
				# Lazy load
				@[field]
				for entity in relations
					#There is not a local reference to the found entity.
					@_relationships[field].add entity

				@_modified._count += 1
				# Notify observers
				@emit "modified", [field, arguments]
				@

		_has_many_list = ->
			enumerable: true
			configurable: false
			# Return the set of entities in the relationship.
			get: ->
				# Check if the field has ever been set
				@[relationship.property] or= []
				if not (field of @_relationships)
					a = @ # Too lazy to .bind
					# The field hasn't been set, so we haven't ever gotten this relationship before.
					@_relationships[field] = new EntityArray @, field, relationship
					@[relationship.property].forEach (id)->
						a._relationships[field].add ec._instances[relationship.to.type][id]
					@_relationships[field].on EntityArray.ADD, (e)->
						a[relationship.property].push e.id()
					@_relationships[field].on EntityArray.REMOVE, (e)->
						i = a[relationship.property].indexOf e.id
						a[relationship.property].splice i, 1

				@_relationships[field]

			# Add an entity to the relationship.
			set: (relations...) ->
				relations = relations.reduce(((a, b)->a.concat(b)), [])
				# Lazy load
				@[field]
				for entity in relations
					#There is not a local reference to the found entity.
					@_relationships[field].add entity
				@[relationship.property] = @_relationships[field].map (_)-> _.id()
				@_modified._count += 1
				# Notify observers
				@emit "modified", [field, arguments]
				@

		access =
			# The multiple relations functions.
			if "has_many" is relationship.type
				if "list" is definition.properties[relationship.property]?.type
					_has_many_list()
				else
					_has_many()
			else
				_has_one()

		Object.defineProperty definition.Constructor::, field, access

		# Helper for has_a::set
		resolve_ids = (related) ->
			# If related is undefined, unset the property
			if related is undefined
				@[relationship.property] = undefined
			# If @'s key is relprop, use it for related
			else if definition.key is relationship.property # Always use this' ID if we can
				related[relationship.to.property] = @[relationship.property]
			else if related._definition().key is relationship.to.property # Back-up ID
				@[relationship.property] = related[relationship.to.property]
			else # No IDs. If one is set, set the other to that
				if @[relationship.property].match UUID.rvalid
					related[relationship.to.property] = @[relationship.property]
				else if related[relationship.to.property].match UUID.rvalid
					@[relationship.property] = related[relationship.to.property]
				else #Nothing is set, use this' id
					id = UUID.v4()
					@[relationship.property] = id
					related[relationship.to.property] = id

	_build_method = (definition, method, func) ->
		func =
			definitions: func.definitions || {}
			order: func.order || []
		body = func.definitions.javascript || ""
		params = func.order
		if body && not body.match /window/
			params.push body
			fn = Function.apply null, params
		else
			fn = ->
		definition.Constructor::[method] = fn

	@load = (contextUri, prototypes) ->
		jiffies.request(contextUri)
		.then (data)->
			_set_context JSON.parse(data), prototypes
			ready.resolve()
		.catch (e) ->
			console.error 'Could not load context'
			console.warn e
			console.log e.stack
			ready.reject e

	# Prepare the runtime with the given contexts.
	if (options && options.debug)
		# The context object was provided by the caller
		_set_context(options.debug.context, protos)
		ready.reject()
	if contextUri then @load contextUri, protos
	@

# #### Entity Array helper
pushResult = (entity)->
	type = entity._type()
	if (!@[type]) then @[type] = []
	@[type].push(entity)

# #### Runtime Prototype
JEFRi.Runtime:: = Object.create Object.assign {}, Eventer,
	# Reset the runtime's data, maintains context definitions.
	clear: ->
		@_instances = {}
		@

	# Get the definition of an entity type.
	definition: (name)->
		name = name._type?() || name
		@_context.entities[name]

	# Add the methods in the extend prototype to the prototype of type specified
	# affecting _ALL_ instances, both current and future, of type.
	extend: (type, extend) ->
		if (@_context.entities[type])
			Object.assign @_context.entities[type].Constructor::, extend::
		@

	# Return the canonical memory reference of the entity.
	intern: (entity, updateOnIntern = false) ->
		updateOnIntern = updateOnIntern || @settings.updateOnIntern

		if (entity.length && ! entity._type)
			#Array-like
			entities = for ent in entity
				@intern(ent, updateOnIntern)
			return entities

		if (updateOnIntern)
			#Merge the given entity into the stored entity.
			ret = @_instances[ entity._type() ][ entity.id() ] || entity
			Object.assign ret._fields, entity._fields
		else
			#Take the stored one if possible, otherwise use the given entity.
			ret = @_instances[ entity._type() ][ entity.id() ] || entity

		#Update the saved entity
		@_instances[ entity._type() ][ entity.id() ] = ret
		ret

	# Return a new instance of an object described in the context.
	build: (type, obj) ->
		def = @definition(type)
		if !def
			throw "JEFRi::Runtime::build '#{type}' is not a defined type in this context."
		obj = obj || {}
		# We are going to build the new entity first, then, if there is a local
		# instance, we will extend the local instance with the new instance.
		r = new def.Constructor obj
		if def.key of obj
			# If the entity key is specified in obj, check the local storage.
			demi = {_type : type}
			demi[def.key] = obj[def.key]
			instance = @find(demi)
			if (instance.length > 0)
				# Local instance, extend it with the new obj and return local.
				instance = instance[0]
				Object.assign instance._fields, r._fields
				return instance
		@_instances[type][r.id() ] = r
		return r

	# Expand and intern a transaction.
	expand: (transaction, action) ->
		action = action || "persisted"

		built = []
		for entity in transaction.entities || []
			e = @build(entity._type, entity)
			e = @intern(e, true)
			built.push(e)

		# Trigger events on all entities
		for e in built
			e.emit action, true

		transaction.entities = built

	# Completely remove an entity from this runtime
	destroy: (entity) ->
		delete @_instances[entity._type() ][entity.id() ]
		@

	# Return an interned entity from the local instance matching spec.
	#
	# Spec requires an _type property and either the entity key or _id set.
	find: (spec) ->
		if (typeof spec is "string")
			spec = {_type : spec}
		to_return = []
		r = @definition(spec._type)
		results = @_instances[spec._type]

		if spec.hasOwnProperty(r.key) or spec.hasOwnProperty('_id')
			# If a key is set, return only that result.
			key = spec[r.key] or spec._id
			if results[key]
				to_return.push(results[key])
		else
			# Add results to an array to clean up the return for the user.
			for key, result of results
				to_return.push result

		to_return
