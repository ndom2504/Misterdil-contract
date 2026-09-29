import type { PrismaClient } from "@prisma/client";
import { DOCUMENT_TYPES } from "../src/lib/catalog";
import { ROLE_PERMISSIONS, WORKSPACE_ROLES } from "../src/lib/domain";

export async function syncReference(prisma: PrismaClient) {
  for (const role of WORKSPACE_ROLES) {
    const keys = ROLE_PERMISSIONS[role.id];
    await prisma.role.upsert({
      where: { id: role.id },
      create: { id: role.id, label: role.label, description: role.description },
      update: { label: role.label, description: role.description },
    });
    await prisma.permission.deleteMany({ where: { roleId: role.id, key: { notIn: keys } } });
    for (const key of keys) {
      await prisma.permission.upsert({
        where: { roleId_key: { roleId: role.id, key } },
        create: { roleId: role.id, key },
        update: {},
      });
    }
  }

  for (const type of DOCUMENT_TYPES) {
    const data = {
      label: type.label,
      description: type.description,
      position: type.position,
      blueprint: JSON.stringify(type.blueprint),
    };
    await prisma.documentType.upsert({
      where: { id: type.id },
      create: { id: type.id, ...data },
      update: data,
    });
    await prisma.formTemplate.deleteMany({ where: { typeId: type.id } });
    await prisma.formTemplate.create({
      data: {
        typeId: type.id,
        name: type.label,
        fields: {
          create: type.fields.map((field, index) => ({
            key: field.key,
            label: field.label,
            help: field.help,
            fieldType: field.fieldType,
            required: field.required,
            position: index + 1,
            groupLabel: field.group,
            sectionAnchor: field.anchor,
            optionsJson: field.options.length ? JSON.stringify(field.options) : "",
            sectors: field.sectors.join(","),
            excludedSectors: field.excludedSectors.join(","),
          })),
        },
      },
    });
  }

  return { roles: WORKSPACE_ROLES.length, types: DOCUMENT_TYPES.length };
}
