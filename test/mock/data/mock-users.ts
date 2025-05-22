import { DEFAULT_PROFILE_IMAGE } from 'src/modules/user/const/user.const';

export const getTestUsers = () => {
  const mockUserList = [];

  for (let i = 1; i <= 20; i++) {
    const mockUser = {
      email: `test${i}@example.com`,
      password: 'Password123!',
      nickname: `testuser${i}`,
      image: DEFAULT_PROFILE_IMAGE,
      teamId: i <= 10 ? 1 : (i % 10) + 1,
    };
    mockUserList.push(mockUser);
  }

  return mockUserList;
};
