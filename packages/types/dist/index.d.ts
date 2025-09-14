import { z } from "zod";

//#region src/schemas/realm.d.ts
declare const idSchema: z.ZodString;
declare const realmIdSchema: z.ZodString;
declare const realmNameSchema: z.ZodString;
declare const realmDescriptionSchema: z.ZodOptional<z.ZodNullable<z.ZodString>>;
declare const realmPasswordSchema: z.ZodOptional<z.ZodNullable<z.ZodString>>;
declare const realmCreateInputSchema: z.ZodObject<{
  name: z.ZodString;
  description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  password: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNullable<z.ZodString>>>>;
}, z.core.$strip>;
type RealmCreateInput = z.infer<typeof realmCreateInputSchema>;
declare const realmMemberRoleSchema: z.ZodEnum<{
  owner: "owner";
  admin: "admin";
  member: "member";
}>;
type RealmMemberRole = z.infer<typeof realmMemberRoleSchema>;
declare const realmMemberCreateInputSchema: z.ZodObject<{
  realmId: z.ZodString;
  userId: z.ZodString;
  role: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    member: "member";
  }>;
}, z.core.$strip>;
type RealmMemberCreateInput = z.infer<typeof realmMemberCreateInputSchema>;
declare const realmTransferOwnershipInputSchema: z.ZodObject<{
  realmId: z.ZodString;
  newOwnerUserId: z.ZodString;
}, z.core.$strip>;
type RealmTransferOwnershipInput = z.infer<typeof realmTransferOwnershipInputSchema>;
declare const realmJoinInputSchema: z.ZodObject<{
  realmId: z.ZodString;
  password: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNullable<z.ZodString>>>>;
}, z.core.$strip>;
type RealmJoinInput = z.infer<typeof realmJoinInputSchema>;
declare const realmUpdateInputSchema: z.ZodObject<{
  id: z.ZodString;
  name: z.ZodOptional<z.ZodString>;
  description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
  password: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNullable<z.ZodString>>>>;
}, z.core.$strip>;
type RealmUpdateInput = z.infer<typeof realmUpdateInputSchema>;
//#endregion
export { RealmCreateInput, RealmJoinInput, RealmMemberCreateInput, RealmMemberRole, RealmTransferOwnershipInput, RealmUpdateInput, idSchema, realmCreateInputSchema, realmDescriptionSchema, realmIdSchema, realmJoinInputSchema, realmMemberCreateInputSchema, realmMemberRoleSchema, realmNameSchema, realmPasswordSchema, realmTransferOwnershipInputSchema, realmUpdateInputSchema };