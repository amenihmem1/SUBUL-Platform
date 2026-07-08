import { User } from './entities/user.entity';

describe('User Entity', () => {
  it('should create a user with all properties', () => {
    const user = new User();
    user.id = 1;
    user.email = 'test@example.com';
    user.passwordHash = 'hashedpassword';
    user.fullName = 'Test User';
    user.profilePicture = 'profile.jpg';
    user.isEmailVerified = true;
    user.role = 'student';
    user.createdAt = new Date();
    user.updatedAt = new Date();

    expect(user.id).toBe(1);
    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBe('hashedpassword');
    expect(user.fullName).toBe('Test User');
    expect(user.profilePicture).toBe('profile.jpg');
    expect(user.isEmailVerified).toBe(true);
    expect(user.role).toBe('student');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });
});
