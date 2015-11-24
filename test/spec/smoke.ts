import { expect } from 'chai';
import { Runtime, Entity } from '../../';

interface User extends Entity {}

describe('Smoke', function() {
  it('loads', function(done) {
    let runtime = new Runtime("https://raw.githubusercontent.com/jefri/runtime/master/test/context/context.json");
    runtime.ready.then(function() {
      let user = runtime.build<User>('User');
      expect(user.id()).to.exist;
    }).then(done, done)
  });
});
