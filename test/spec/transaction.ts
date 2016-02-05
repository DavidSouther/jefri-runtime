import { UUID } from 'jefri-jiffies';
import { expect } from 'chai';
import { Runtime, Transaction } from '../../src/index';
import * as UserContext from '../context/typing/user-context';

describe("Transaction", function() {
  let runtime: Runtime = null;
  beforeEach(function(done) {
    runtime = new Runtime("https://raw.githubusercontent.com/jefri/runtime/master/test/context/user.json");
    runtime.ready.then(()=>done(), done);
  });

  it("Transaction Basics", function() {
    let user = runtime.build<UserContext.User>("User", {
      name: "southerd",
      address: "davidsouther@gmail.com"
    });
    let authinfo = user.authinfo;
    let transaction = new Transaction();
    transaction.add([user, authinfo]);
    expect(transaction.entities.length).to.equal(2, "Has both entities.");
  });

  it('does not clobber transactions', function() {
    let transaction = new Transaction({
      attributes: {
        foo: 'bar'
      },
      entities: [
        {
          _type: "fizz",
          _id: UUID.v4()
        }, {
          _type: "bazz",
          _id: UUID.v4()
        }
      ]
    });
    expect(transaction.attributes['foo']).to.equal('bar');
    expect(transaction.entities.length).to.equal(2);
  });
});

