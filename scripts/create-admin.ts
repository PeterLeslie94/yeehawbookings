import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../app/lib/auth/password';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');

    const email = 'peterlesliepay@gmail.com';
    const password = 'admin123'; // You should change this password after first login
    const name = 'Peter Leslie';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`❌ User with email ${email} already exists`);
      
      // Update existing user to admin role if not already
      if (existingUser.role !== 'ADMIN') {
        await prisma.user.update({
          where: { email },
          data: { role: 'ADMIN' }
        });
        console.log(`✅ Updated existing user ${email} to ADMIN role`);
      } else {
        console.log(`ℹ️  User ${email} is already an ADMIN`);
      }
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(), // Mark as verified for admin
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`👤 Name: ${adminUser.name}`);
    console.log(`🔑 Role: ${adminUser.role}`);
    console.log(`🆔 ID: ${adminUser.id}`);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change this password after your first login!');
    console.log('🌐 Access the admin dashboard at: /admin/dashboard');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser();