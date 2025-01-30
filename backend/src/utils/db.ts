import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureUser() {
  let user = await prisma.user.findFirst();
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'default@example.com',
        passwordHash: 'default_hash_for_testing_only',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  return user;
}

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
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  return entry;
}

export { prisma };