import { expect } from 'chai';
import { Runtime } from '../../';

import * as UserContext from 'user-context';

describe('Smoke', function() {
  it('loads', function(done) {
    let runtime = new Runtime("https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(function() {
      let user = runtime.build<UserContext.User>('User');
      expect(user.id()).to.exist;
    }).then(done, done)
  });
});