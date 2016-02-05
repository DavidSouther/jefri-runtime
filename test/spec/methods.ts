import { Entity } from '../../src/index';

module Methods {
  export interface Foo extends Entity {
    foo_id: string;
    a: number;
    b: number;
    hello(): string;
    sum(): number;
    scale(s: number): number;
  }
}


const MethodContext = {
  entities: {
    Foo: {
      key: "foo_id",
      properties: {
        foo_id: {
          type: "string"
        },
        a: {
          type: "number"
        },
        b: {
          type: "number"
        }
      },
      methods: {
        hello: {
          "return": "string",
          definitions: {
            javascript: "return \"Hello World\";"
          }
        },
        sum: {
          "return": "number",
          definitions: {
            javascript: "return this.a + this.b;"
          }
        },
        scale: {
          "return": "number",
          params: {
            s: {
              type: "number"
            }
          },
          order: ["s"],
          definitions: {
            javascript: "var a = this.a; var r = a * s; return r;"
          }
        }
      }
    }
  }
};

import { expect } from 'chai';
import { Runtime } from '../../src/index';

function equal(a: any, b: any, c: string) {
  expect(a).to.equal(b, c);
}

describe("JEFRi Methods", function() {
  it("handles basic methods", function() {
    let runtime = new Runtime("", { debug: { context: MethodContext } });
    let foo = runtime.build<Methods.Foo>("Foo", { a: 1, b: 2 });
    equal("Hello World", foo.hello(), "hello returns string.");
    equal(3, foo.sum(), "Methods operate on local numbers.");
    equal(2, foo.scale(2), "Methods take parameters.");
  });
});

