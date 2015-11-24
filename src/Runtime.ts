export interface Entity {
  id(): string;
}

export class Runtime {
  public ready: Promise<Runtime> = Promise.resolve(this);
  constructor(contextUri: string, options?: any, protos?: any) {}
  build<T extends Entity>(entityType: string): Entity {
    return { id: function(): string { return ''; } };
  }
}

