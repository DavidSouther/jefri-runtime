import {expect} from 'chai';
import {Runtime} from '../../src/index';

import * as UserContext from '../context/typing/user-context';

describe("Properties", function() {
  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime(
        "https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(() => done(), done);
  });

  it("have good defaults", function() {
    let user = runtime.build<UserContext.User>(
        "User", {name: "southerd", address: "davidsouther@gmail.com"});
    expect(user.nicknames).to.be.instanceOf(Array);
    user.nicknames.push('David');
    user.nicknames.push('Dave');
    expect(user.nicknames.length).to.equal(2);
  });

  it('changes the modified count when editing relationships', function() {
    let user = runtime.build<UserContext.User>("User", {});
    // expect(user._status).to.equal('NEW');
    user.name = 'David';
    user.address = 'davidsouther@gmail.com';
    expect(user._metadata._modified._count).to.equal(2);
  });

  it.skip("is not new after expansion", function() {
    (<any>runtime).expand({
      entities: [
        {
          "_type": "User",
          "_id": "0065ea14-36e7-4aae-9729-623740d1a240",
          "name": "David"
        }
      ]
    });
    let ct: UserContext.User = null;
    ct = runtime.find<UserContext.User>('User')[0];
    expect(ct._status).to.equal("PERSISTED");
  });
});
