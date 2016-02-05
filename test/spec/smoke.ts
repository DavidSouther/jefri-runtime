import {expect} from 'chai';
import {Runtime} from '../../src/index';

import * as UserContext from '../context/typing/user-context';

describe('Smoke', function() {
  it('loads', function(done) {
    let runtime = new Runtime(
        "https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    function testUser() {
      let user = runtime.build<UserContext.User>('User');
      expect(user.id()).to.exist;
    };
    runtime.ready.then(testUser).then(done, done)
  });
});
