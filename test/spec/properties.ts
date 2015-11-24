import { expect } from 'chai';
import { Runtime } from '../../';

import * as UserContext from 'user-context';

describe("Properties", function() {
  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime("https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(()=>done(), done);
  });
  it("have good defaults", function() {
    let user = runtime.build<UserContext.User>("User", {
      name: "southerd",
      address: "davidsouther@gmail.com"
    });
    expect(user.nicknames).to.be.instanceOf(Array);
    user.nicknames.push('David');
    user.nicknames.push('Dave');
    expect(user.nicknames.length).to.equal(2);
  });
});
