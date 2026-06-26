import prisma from '../src/shared/db/prisma.js';

async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    console.log('Valid User ID:', user.id);
  } else {
    console.log('No users found in database.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
