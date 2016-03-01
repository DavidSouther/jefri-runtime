import {expect} from 'chai';
import {isEntity, Entity, Runtime} from '../../src/index';
import * as UserContext from '../context/typing/user-context';

function equal(a: any, b: any, m: string = '') {
  expect(a).to.equal(b, m);
}

function ok(a: any, m?: string) {
  expect(a).to.exist;
}

describe("JEFRi Runtime", function() {
  it("isEntity", function() {
    [null, void 0, "", 'foo', 123, 45.67].forEach(function(e) {
      equal(isEntity(e), false, `'${e}' is not an entity`);
    });
  });

  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime(
        "https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(() => done(), done);
  });

  it("Instantiate Runtime", function() {
    ok(runtime.definition("Authinfo"));
    ok(runtime.definition("User"));
    let user = runtime.build<UserContext.User>(
        "User", {name: "southerd", address: "davidsouther@gmail.com"});
    let id = user.id();
    equal(user._status, "NEW", "Built user should be New");

    ok(id.match(/[a-f0-9\-]{36}/i), "User should have a valid id.");
    equal(user.id(), user.user_id,
          "User id() and user_id properties must match.");
    user.authinfo = runtime.build<UserContext.Authinfo>("Authinfo", {});

    let authinfo = user.authinfo;
    equal(authinfo._status, "NEW", "Built authinfo should be New");
    ok(authinfo.id().match(/[a-f0-9\-]{36}/i),
       "Authinfo should have a valid id.");
    ok(authinfo.id(true).match(/[a-zA-Z_\-]+\/[a-f0-9\-]{36}/i),
       "id(true) returns full path.");
    equal(authinfo.user_id, user.id(), "Authinfo IDs correct user.");
    equal(authinfo.user, user, "Authinfo refers to correct user");
    equal(id, user.id(), "ID not overwritten on entity set.");

    ok(authinfo._destroy, "Entity can be destroyed.");
    let aid = authinfo.id();
    authinfo._destroy();
    equal(authinfo.id(), '', "ID zeroed.");
  });

  it("errors on exceptional cases", function() {
    function getBadType(): Entity { return runtime.build("foo"); };
    let checkBadTypeException =
        "JEFRi::Runtime::build 'foo' is not a defined type in this context.";
    expect(getBadType).to.throw(checkBadTypeException);
  });

  it('finds on spec', function() {
    let user = runtime.build<UserContext.User>(
        "User", {name: "southerd", address: "davidsouther@gmail.com"});
    user.authinfo = runtime.build<UserContext.Authinfo>("Authinfo", {});
    let user2 = runtime.build<UserContext.User>(
        "User", {name: "portaj", address: "rurd4me@example.com"});
    let users = runtime.find<UserContext.User>({_type: 'User', _id: user.id()});
    expect(users.length).to.equal(1);
    expect(users[0].id()).to.equal(user.id());
  });

  it('can be encoded', function() {
    let user = runtime.build<UserContext.User>(
        "User", {name: "southerd", address: "davidsouther@gmail.com"});
    user.authinfo = runtime.build<UserContext.Authinfo>("Authinfo", {});
    expect(user._encode())
        .to.deep.equal({
          _type: 'User',
          _id: user._id,
          user_id: user._id,
          name: 'southerd',
          address: 'davidsouther@gmail.com',
          nicknames: [],
        });
  });
});
