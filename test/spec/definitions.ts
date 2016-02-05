import { expect } from 'chai';
import { Runtime } from '../../src/index';

import * as UserContext from '../context/typing/user-context';

describe("Definition", function() {
  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime("https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(()=>done(), done);
  });
  it("is available from an instance", function() {
    let user = runtime.build<UserContext.User>("User", {
      name: "southerd",
      address: "davidsouther@gmail.com"
    });
    expect(user._definition).to.have.property('type');
    expect(user._definition.type).to.equal('User');
  });
});

