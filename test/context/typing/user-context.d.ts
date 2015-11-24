declare module UserContext {
  interface Context {
    User: UserContext.User;
    Authinfo: UserContext.Authinfo;
  }

  interface User extends JEFRi.Entity {
    user_id: string;
    name: string;
    address: string;
    nicknames: string[];
    authinfo: Authinfo;
  }

  interface Authinfo extends JEFRi.Entity {
    authinfo_id: string;
    user_id: string;
    username: string;
    password: string;
    user: User;
  }
}

declare module "user-context" {
  var c: UserContext.Context;
  export = c;
}

