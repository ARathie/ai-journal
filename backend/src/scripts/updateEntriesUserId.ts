import { prisma } from '../utils/db';

async function run() {
  try {
    // First, ensure a user record exists with id "test-user"
    const testUser = await prisma.user.upsert({
      where: { id: "test-user" },
      update: {},
      create: {
        id: "test-user",
        email: "test@test.com",
        passwordHash: "test-hash" // For testing purposes only; in production use a proper hashed password.
      }
    });
    console.log("Ensured test user exists:", testUser.id);

    // Now update all journal entries that have the old user id to the test user id.
    const result = await prisma.journalEntry.updateMany({
      where: { userId: "a461a549-80d6-4826-96b9-f2c25e70dd15" },
      data: { userId: "test-user" }
    });
    console.log(`Updated ${result.count} entries to use userId "test-user".`);
  } catch (error) {
    console.error("Error updating entries:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run(); 