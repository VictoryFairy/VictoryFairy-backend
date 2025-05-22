import { DEFAULT_PROFILE_IMAGE } from 'src/modules/user/const/user.const';

export const getTestUser = () => {
  const mockerUserList = [];

  for (let i = 1; i <= 20; i++) {
    const mockUser = {
      email: `test${i}@example.com`,
      password: 'Password123!',
      nickname: `testuser${i}`,
      image: DEFAULT_PROFILE_IMAGE,
      teamId: i <= 10 ? 1 : (i % 10) + 1,
    };
    mockerUserList.push(mockUser);
  }

  return mockerUserList;
};
