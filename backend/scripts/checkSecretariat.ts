import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

async function main() {
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: 'secretariat@ncism.edu' } })
    console.log('User:', { id: user?.id, email: user?.email, role: user?.role, hasHash: !!user?.password_hash })
    if (user?.password_hash) {
      const ok = await bcrypt.compare('Secret@123', user.password_hash)
      console.log('Password match:', ok)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


