describe "JEFRi", (a)->
	jefri = require "../../../../lib/jefri"
	_ = require "superscore"

	context = runtime = null
	loaded = done = false

	beforeEach ->
		runtime = new jefri.Runtime "http://localhost:8000/context.json"
		runtime.ready.then (a)->
			context = runtime.build "Context", name: "network"

			router = runtime.build "Entity",
				"name": "Router",
				"key": "router_id"

			host = runtime.build "Entity",
				"name": "Host"
				"key": "host_id"

			context.entities [host, router]
			
			router.properties [
				runtime.build "Property",
					name: "router_id"
					type: "string"
				runtime.build "Property",
					name: "name"
					type: "string"
			]

			router_hosts = runtime.build "Relationship",
				name: "hosts"
				type: "has_many"
				to_property: "router_id"
				from_property: "router_id"
			router_hosts.to host
			router_hosts.from router

			host.properties [
				runtime.build "Property",
					name: "host_id",
					type: "string"
				runtime.build "Property",
					name: "hostname",
					type: "string"
				runtime.build "Property",
					name: "ip",
					type: "string"
				runtime.build "Property",
					name: "mac",
					type: "string"
				runtime.build "Property",
					name: "router_id"
					type: "string"
			]

			host_router = runtime.build "Relationship",
				name: "router"
				type: "has_a"
				to_property: "router_id"
				from_property: "router_id"
			host_router.to router
			host_router.from host

			loaded = true
		waitsFor -> loaded

	afterEach ->
		waitsFor -> done
		runs -> loaded = done = false

	it "exports", ->
		runs ->
			debugger
			expect(context.export) .toBeDefined()
			stringContext = context.export()
			expect(stringContext.length) .toBeGreaterThan 0
			contextContent = JSON.parse stringContext
			expect(_(contextContent.entities).keys().length) .toBe 2
			expect(contextContent.entities.Router.key) .toBe "router_id"
			expect(contextContent.entities.Host.relationships.router.to.type) .toBe "Router"
			console.log stringContext
			done = true
