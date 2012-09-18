(function($){
	
	module("JEFRi Relationships");

	test("Unit Testing Environment", function(){
		expect(1);
		ok(!isLocal, "Unit tests shouldn't be run from file://, especially in Chrome");
	});

	asyncTest("has_a/has_a set", function(){
		runtime = new JEFRi.Runtime("",
			{debug: {
				context: {
					entities: {
						Foo: {
							key: "foo_id",
							properties: {
								foo_id: {type: "string"},
								bar_id: {type: "string"}
							},
							relationships: {
								bar: {
									type: "has_a",
									property: "bar_id",
									to: {
										type: "Bar",
										property: "foo_id"
									}
								}
							}
						},
						Bar: {
							key: "bar_id",
							properties: {
								bar_id: {type: "string"},
								foo_id: {type: "string"}
							},
							relationships: {
								foo: {
									type: "has_a",
									property: "foo_id",
									to: {
										type: "Foo",
										property: "bar_id"
									}
								}
							}
						}
					}
				}
			}}
		);

		runtime.ready.done(function(){
			ok(runtime._instances.Foo, "Runtime instantiated.");

			var foo = runtime.build("Foo");
			fid = foo.id(true);
			var bar = runtime.build("Bar");
			bid = bar.id(true);

			foo.bar(bar);

			equal(fid, foo.id(true), "Anchor kept id.");
			equal(bid, bar.id(true), "Related kept id.");

			equal(foo.bar_id(), bar.bar_id(), "Anchor rel prop is Related rel prop.");
			equal(bar.foo_id(), foo.foo_id(), "Related rel prop is Anchor rel prop.");

			ok(foo._relationships.bar === bar, "Anchor points to correct related.");
			ok(bar._relationships.foo === foo, "Related points to correct anchor.");

			start();
		});
	});

	asyncTest("has_a/has_a (key relationship) set", function(){
		runtime = new JEFRi.Runtime("",
			{debug: {
				context: {
					entities: {
						Foo: {
							key: "foo_id",
							properties: {
								foo_id: {type: "string"}
							},
							relationships: {
								bar: {
									type: "has_a",
									property: "foo_id",
									to: {
										type: "Bar",
										property: "foo_id"
									}
								}
							}
						},
						Bar: {
							key: "foo_id",
							properties: {
								foo_id: {type: "string"}
							},
							relationships: {
								foo: {
									type: "has_a",
									property: "foo_id",
									to: {
										type: "Foo",
										property: "foo_id"
									}
								}
							}
						}
					}
				}
			}}
		);

		runtime.ready.done(function(){
			ok(runtime._instances.Foo, "Runtime instantiated.");

			var foo = runtime.build("Foo");
			fid = foo.id(true);
			var bar = runtime.build("Bar", {foo_id: foo.id()});
			bid = bar.id(true);

			foo.bar(bar);

			equal(fid, foo.id(true), "Anchor kept id.");
			equal(bid, bar.id(true), "Related kept id.");

			equal(foo.foo_id(), bar.foo_id(), "Anchor rel prop is Related rel prop.");
			equal(bar.foo_id(), foo.foo_id(), "Related rel prop is Anchor rel prop.");

			ok(foo._relationships.bar === bar, "Anchor points to correct related.");
			ok(bar._relationships.foo === foo, "Related points to correct anchor.");

			start();
		});
	});
}(jQuery));