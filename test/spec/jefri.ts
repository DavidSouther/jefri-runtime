import {expect} from 'chai';
import {Runtime, EntityArray} from '../../src/index';

import {Context} from '../context/typing/jefri-context';

describe("Entity Array", function() {
  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime(
        "https://raw.githubusercontent.com/jefri/runtime/master/test/context/jefri.json");
    runtime.ready.then(() => done(), done);
  });
  it("converts to a plain array", function() {
    let context = runtime.build<Context>('Context');
    expect(context.entities.toArray()).to.be.instanceOf(Array);
  });
});
