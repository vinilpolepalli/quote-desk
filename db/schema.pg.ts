// Postgres mirror of db/schema.ts (same exported names/columns). Used when DATABASE_URL is set.
import { pgTable, text, integer, doublePrecision, serial, uniqueIndex } from "drizzle-orm/pg-core";

export const owners = pgTable("owners", { id: text("id").primaryKey(), createdAt: text("created_at").notNull() });
export const parts = pgTable("parts", {
  rowId: serial("row_id").primaryKey(), ownerId: text("owner_id").notNull(), partId: text("part_id").notNull(), data: text("data").notNull(),
});
export const assumptionVersions = pgTable("assumption_versions", {
  rowId: serial("row_id").primaryKey(), ownerId: text("owner_id").notNull(), version: integer("version").notNull(),
  data: text("data").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("av_owner_ver").on(t.ownerId, t.version)]);
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), number: integer("number").notNull(), status: text("status").notNull(),
  createdAt: text("created_at").notNull(), acceptedSeq: integer("accepted_seq"), committedHours: doublePrecision("committed_hours"),
});
export const quoteRevisions = pgTable("quote_revisions", {
  rowId: serial("row_id").primaryKey(), quoteId: text("quote_id").notNull(), rev: integer("rev").notNull(),
  assumptionsVersion: integer("assumptions_version").notNull(), committedLoadAtPricing: doublePrecision("committed_load_at_pricing").notNull(),
  part: text("part").notNull(), result: text("result").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("qr_quote_rev").on(t.quoteId, t.rev)]);
export const allocations = pgTable("allocations", {
  rowId: serial("row_id").primaryKey(), ownerId: text("owner_id").notNull(), orderId: text("order_id").notNull(),
  week: integer("week").notNull(), hours: doublePrecision("hours").notNull(),
});
