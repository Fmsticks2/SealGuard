import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sealguard.app' },
    update: {},
    create: {
      email: 'admin@sealguard.app',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'ADMIN',
      isActive: true
    }
  });

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      walletAddress: '0x9876543210987654321098765432109876543210',
      role: 'USER',
      isActive: true
    }
  });

  // Create sample documents
  const sampleDoc1 = await prisma.document.create({
    data: {
      description: 'A sample contract agreement for testing purposes',
      fileName: 'contract-agreement.pdf',
      originalName: 'Contract Agreement.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      ipfsHash: 'QmSampleHash1234567890abcdef',
      ipfsUrl: 'https://ipfs.io/ipfs/QmSampleHash1234567890abcdef',
      tags: 'legal,agreement,contract',
      status: 'VERIFIED',
      isPublic: false,
      uploaderId: testUser.id,
      checksum: 'sha256:abcdef1234567890',
      encryptionKey: 'encrypted-key-placeholder'
    }
  });

  const sampleDoc2 = await prisma.document.create({
    data: {
      description: 'A public policy document available to all users',
      fileName: 'public-policy.pdf',
      originalName: 'Public Policy Document.pdf',
      fileSize: 2048000,
      mimeType: 'application/pdf',
      ipfsHash: 'QmAnotherHash0987654321fedcba',
      ipfsUrl: 'https://ipfs.io/ipfs/QmAnotherHash0987654321fedcba',
      tags: 'policy,public,governance',
      status: 'VERIFIED',
      isPublic: true,
      uploaderId: admin.id,
      checksum: 'sha256:fedcba0987654321',
      encryptionKey: null
    }
  });

  // Create verification records
  await prisma.verificationRecord.create({
    data: {
      documentId: sampleDoc1.id,
      verifierId: admin.id,
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      blockNumber: 12345,
      gasUsed: '21000',
      errorMessage: null
    }
  });

  await prisma.verificationRecord.create({
    data: {
      documentId: sampleDoc2.id,
      verifierId: admin.id,
      transactionHash: '0xfedcba0987654321fedcba0987654321fedcba09',
      blockNumber: 12346,
      gasUsed: '21000',
      errorMessage: null
    }
  });

  // Create sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: testUser.id,
        type: 'DOCUMENT_VERIFIED',
        title: 'Document Verified',
        message: 'Your document "Sample Contract Agreement" has been successfully verified on the blockchain.',
        isRead: false,
        metadata: JSON.stringify({
          documentId: sampleDoc1.id,
          documentFileName: sampleDoc1.fileName
        })
      },
      {
        userId: testUser.id,
        type: 'SYSTEM_UPDATE',
        title: 'Welcome to SealGuard',
        message: 'Welcome to SealGuard! Your account has been successfully created.',
        isRead: false,
        metadata: JSON.stringify({
          welcomeMessage: true
        })
      },
      {
        userId: admin.id,
        type: 'DOCUMENT_UPLOADED',
        title: 'New Document Uploaded',
        message: 'A new document has been uploaded and is pending verification.',
        isRead: true,
        metadata: JSON.stringify({
          documentId: sampleDoc1.id,
          uploaderId: testUser.id
        })
      }
    ]
  });

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'USER_LOGIN',
        entity: 'auth',
        entityId: admin.id
      },
      {
        userId: testUser.id,
        action: 'DOCUMENT_UPLOAD',
        entity: 'document',
        entityId: sampleDoc1.id
      },
      {
        userId: admin.id,
        action: 'DOCUMENT_VERIFY',
        entity: 'document',
        entityId: sampleDoc1.id
      }
    ]
  });

  // Create system configuration
  await prisma.systemConfig.upsert({
    where: { key: 'max_file_size' },
    update: {},
    create: {
      key: 'max_file_size',
      value: '10485760',
      description: 'Maximum file size in bytes (10MB)'
    }
  });

  await prisma.systemConfig.upsert({
    where: { key: 'allowed_file_types' },
    update: {},
    create: {
      key: 'allowed_file_types',
      value: 'pdf,doc,docx,txt,jpg,jpeg,png,gif',
      description: 'Comma-separated list of allowed file extensions'
    }
  });

  await prisma.systemConfig.upsert({
    where: { key: 'notification_retention_days' },
    update: {},
    create: {
      key: 'notification_retention_days',
      value: '30',
      description: 'Number of days to retain notifications'
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`👤 Admin user: admin@sealguard.app (password: admin123)`);
  console.log(`👤 Test user: user@example.com (password: user123)`);
  console.log(`📄 Created ${2} sample documents`);
  console.log(`🔔 Created ${3} sample notifications`);
  console.log(`📋 Created ${3} audit log entries`);
  console.log(`⚙️ Created ${3} system configuration entries`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });