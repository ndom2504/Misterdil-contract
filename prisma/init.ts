import { PrismaClient } from "@prisma/client";
import { syncReference } from "./reference";

const prisma = new PrismaClient();

syncReference(prisma)
  .then(({ roles, types }) => console.log(`Catalogue synchronisé : ${roles} rôles, ${types} types de documents.`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
