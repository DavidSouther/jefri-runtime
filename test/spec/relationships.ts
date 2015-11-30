module HasAHasA {
  export interface Foo extends JEFRi.Entity {
    foo_id: string;
    bar_id: string;
    bar: Bar;
  }

  export interface Bar extends JEFRi.Entity {
    bar_id: string;
    foo_id: string;
    foo: Foo;
  }
}

const HasAHasAContext = {
  entities: {
    Foo: {
      key: "foo_id",
      properties: {
        foo_id: {
          type: "string"
        },
        bar_id: {
          type: "string"
        }
      },
      relationships: {
        bar: {
          type: "has_a",
          property: "bar_id",
          to: {
            type: "Bar",
            property: "bar_id"
          },
          back: "foo"
        }
      }
    },
    Bar: {
      key: "bar_id",
      properties: {
        bar_id: {
          type: "string"
        },
        foo_id: {
          type: "string"
        }
      },
      relationships: {
        foo: {
          type: "has_a",
          property: "foo_id",
          to: {
            type: "Foo",
            property: "foo_id"
          },
          back: "bar"
        }
      }
    }
  }
};


module HasAHasMany {
  export interface Foo extends JEFRi.Entity {
    foo_id: string;
    bar_id: string;
    bar: Bar;
  }

  export interface Bar extends JEFRi.Entity {
    bar_id: string;
    foo: JEFRi.EntityArray<Foo>;
  }
}


const HasAHasManyContext = {
  entities: {
    Foo: {
      key: "foo_id",
      properties: {
        foo_id: {
          type: "string"
        },
        bar_id: {
          type: "string"
        }
      },
      relationships: {
        bar: {
          type: "has_a",
          property: "bar_id",
          to: {
            type: "Bar",
            property: "bar_id"
          },
          back: "foo"
        }
      }
    },
    Bar: {
      key: "bar_id",
      properties: {
        bar_id: {
          type: "string"
        }
      },
      relationships: {
        foo: {
          type: "has_many",
          property: "bar_id",
          to: {
            type: "Foo",
            property: "foo_id"
          },
          back: "bar"
        }
      }
    }
  }
};


module HasList {
  export interface Foo extends JEFRi.Entity {
    foo_id: string;
    bar_ids: string[];
    bars: JEFRi.EntityArray<Bar>;
  }

  export interface Bar extends JEFRi.Entity {
    bar_id: string;
  }
}

const HasListContext = {
  entities: {
    Foo: {
      key: "foo_id",
      properties: {
        foo_id: {
          type: "string"
        },
        bar_ids: {
          type: "list"
        }
      },
      relationships: {
        bars: {
          type: "has_many",
          property: "bar_ids",
          to: {
            type: "Bar",
            property: "bar_id"
          }
        }
      }
    },
    Bar: {
      key: "bar_id",
      properties: {
        bar_id: {
          type: "string"
        }
      }
    }
  }
};

import { expect } from 'chai';
import { Runtime } from '../../';

describe("JEFRi Relationships", function() {
  it("has_a/has_a set", function() {
    "Testing has_a relationships with back references.";
    let runtime = new Runtime("", {
      debug: {
        context: HasAHasAContext
      }
    });
    let foo = runtime.build<HasAHasA.Foo>("Foo");
    let fid = foo.id(true);
    let bar = runtime.build<HasAHasA.Bar>("Bar");
    let bid = bar.id(true);
    foo.bar = bar;
    expect(foo.id(true)).to.equal(fid, "Anchor kept id.");
    expect(bar.id(true)).to.equal(bid, "Related kept id.");
    expect(foo.bar).to.equal(bar, "Anchor points to correct related.");
    expect(bar.foo).to.equal(foo, "Related points to correct anchor.");
    expect(foo.foo_id).to.equal(bar.foo_id, "Anchor rel prop is Related rel prop.");
    expect(foo.bar_id).to.equal(bar.bar_id, "Anchor rel prop is Related rel prop.");
  });

  it("has_a/has_a (key relationship) set", function() {
    "Testing specifically relationships through primary keys.";
    let runtime = new Runtime("", { debug: { context: HasAHasAContext } });

    let foo = runtime.build<HasAHasA.Foo>("Foo");
    let fid = foo.id(true);
    let bar = runtime.build<HasAHasA.Bar>("Bar", { foo_id: foo.id() });
    let bid = bar.id(true);

    expect(bar.foo._equals(foo)).to.be.true;
    expect(foo.bar._equals(bar)).to.be.true;

    expect(foo.id(true)).to.equal(fid, "Anchor kept id.");
    expect(bar.id(true)).to.equal(bid, "Related kept id.");
    expect(foo.foo_id).to.equal(bar.foo_id, "Anchor rel prop is Related rel prop.");
    expect(foo.bar_id).to.equal(bar.bar_id, "Anchor rel prop is Related rel prop.");
  });

  it("has_many/has_a set", function() {
    "Testing has_many to has_a relationships.";
    let runtime = new Runtime("", { debug: { context: HasAHasManyContext } });

    let foo_a = runtime.build<HasAHasMany.Foo>("Foo");
    let foo_b = runtime.build<HasAHasMany.Foo>("Foo");
    let fida = foo_a.id();
    let fidb = foo_b.id();

    let bar = runtime.build<HasAHasMany.Bar>("Bar");
    let bid = bar.id();
    foo_a.bar = bar;
    foo_b.bar = bar;
    expect(foo_a.bar_id).to.equal(bid, "Many side a got correct has_a id.");
    expect(foo_b.bar_id).to.equal(bid, "Many side b got correct has_a id.");
    expect(bar.foo.length).to.equal(2, "bar has two foo");
    foo_a.bar = null;
    expect(foo_a.bar_id).to.equal(null, "foo_a bar_id unset.");
    expect(bar.foo.length).to.equal(1, "bar has one foo after removal.");
    bar.foo.remove(foo_b);
    expect(foo_b.bar_id).to.equal(null, "foo_b bar_id unset");
    expect(bar.foo.length).to.equal(0, "bar has no foo");
  });

  return it("has_list", function() {
    "Testing has_list relationships.";
    let runtime = new Runtime("", { debug: { context: HasListContext } });
    let foo = runtime.build<HasList.Foo>("Foo");
    let bars = [
      runtime.build<HasList.Bar>("Bar"),
      runtime.build<HasList.Bar>("Bar"),
      runtime.build<HasList.Bar>("Bar")
    ];
    foo.bars.add(bars);
    foo.bars.add(runtime.build<HasList.Bar>("Bar"));
    expect(foo.bars.length).to.equal(4, 'Entity was added.');
    expect(foo.bar_ids.length).to.equal(4, 'Has all IDs.');
    /*TODO
    transaction = new JEFRi.Transaction();
    transaction.add(foo);
    result = transaction.encode();
    equal(result.entities[0].bar_ids.length, 4, "Has all entities.");
    foo2 = runtime.expand(result)[0];
    foo2.bars.forEach(function(e) {
      return JEFRi.isEntity(e).should.equal(true);
    });
    */
  });
});
