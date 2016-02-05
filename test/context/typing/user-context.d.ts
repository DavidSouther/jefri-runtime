import { Entity } from '../../../src/index'; 

export interface User extends Entity {
  user_id: string;
  name: string;
  address: string;
  nicknames: string[];
  authinfo: Authinfo;
}

export interface Authinfo extends Entity {
  authinfo_id: string;
  user_id: string;
  username: string;
  password: string;
  user: User;
}
