import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const studentPass = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "admin@rf.com" },
    update: {},
    create: {
      email: "admin@rf.com",
      passwordHash: adminPass,
      role: "admin",
      active: true
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "maria@exemplo.com" },
    update: {},
    create: {
      email: "maria@exemplo.com",
      passwordHash: studentPass,
      role: "student",
      active: true
    }
  });

  await prisma.studentDocument.upsert({
    where: { userId_docType: { userId: student.id, docType: "training" } },
    update: {},
    create: {
      userId: student.id,
      docType: "training",
      url: "https://drive.google.com/file/d/SEU_ID/preview"
    }
  });

  console.log("Seed ok!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
