const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestAccount() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('Testing@123', 10);

    // Create the user
    const user = await prisma.user.upsert({
      where: { email: 'testing@softims.com' },
      update: {
        password: hashedPassword,
        subscriptionTier: 'PLUS',
        isEmailVerified: true,
      },
      create: {
        email: 'testing@softims.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        subscriptionTier: 'PLUS',
        isEmailVerified: true,
        phone: '9876543210',
        companyName: 'Test Company',
      },
    });

    console.log('✅ Test account created successfully:', user.email);
    console.log('Email:', user.email);
    console.log('Password: Testing@123');
    console.log('Subscription: PLUS');
  } catch (error) {
    console.error('❌ Error creating test account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccount();
