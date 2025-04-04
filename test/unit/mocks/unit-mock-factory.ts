import { Repository } from 'typeorm';

export type TMockRepo<T = any> =
  | Partial<Record<keyof T, jest.Mock>>
  | Partial<T>;

export type TMockService<T = any> = Partial<Record<keyof T, jest.Mock>>;

export class MockRepoFactory {
  static createMockRepo<T>(type?: new (...args: any[]) => T): TMockRepo<T> {
    const mockRepo: TMockRepo = {};

    Object.getOwnPropertyNames(Repository.prototype)
      .filter((key: string) => key !== 'constructor')
      .forEach((key: string) => {
        mockRepo[key] = jest.fn();
      });

    if (type) {
      Object.getOwnPropertyNames(type.prototype)
        .filter((key: string) => key !== 'constructor')
        .forEach((key: string) => {
          mockRepo[key] = jest.fn();
        });
    }

    return mockRepo;
  }
}

export class MockServiceFactory {
  static createMockService<T>(type: new (...arg: any[]) => T): TMockService<T> {
    const mockService: TMockService = {};

    Object.getOwnPropertyNames(type.prototype)
      .filter((key: string) => key !== 'constructor')
      .forEach((key: string) => {
        mockService[key] = jest.fn();
      });
    return mockService;
  }
}
