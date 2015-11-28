import { expect } from 'chai';
import { Runtime } from '../../';

import * as UserContext from 'user-context';

describe("Definition", function() {
  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime("https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(()=>done(), done);
  });
  it.only("is available from an instance", function() {
    let user = runtime.build<UserContext.User>("User", {
      name: "southerd",
      address: "davidsouther@gmail.com"
    });
    let definition = user._definition();
    expect(definition).to.have.property('type');
    expect(definition.type).to.equal('User');
  });
});
