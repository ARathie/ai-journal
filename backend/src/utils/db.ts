import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const TEST_USER_ID = 'test-user';
const TEST_USER_EMAIL = 'test@test.com';

/**
 * Ensures that a test user exists.
 * Returns the user with id "test-user".
 */
export async function ensureUser() {
  let user = await prisma.user.findUnique({
    where: { id: TEST_USER_ID }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: TEST_USER_ID,  // Set the id explicitly for the test user
        email: TEST_USER_EMAIL,
        passwordHash: 'default_hash_for_testing_only',
      }
    });
  }
  
  return user;
}

/**
 * Ensures that a JournalEntry with the specified id exists.
 * If not, creates it using the test user (returned by ensureUser()).
 */
export async function ensureJournalEntry(entryId: string, content: string = '') {
  let entry = await prisma.journalEntry.findUnique({
    where: { id: entryId }
  });
  
  if (!entry) {
    const user = await ensureUser();
    entry = await prisma.journalEntry.create({
      data: {
        id: entryId,
        content,
        userId: user.id,
      }
    });
  }
  
  return entry;
}