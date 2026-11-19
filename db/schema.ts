import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const owners = sqliteTable("owners", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
});

// SAMPLE catalog, seeded per owner.
export const parts = sqliteTable("parts", {
  rowId: integer("row_id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  partId: text("part_id").notNull(),
  data: text("data").notNull(), // JSON Part
});

// Append-only: every edit inserts a new version.
export const assumptionVersions = sqliteTable("assumption_versions", {
  rowId: integer("row_id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  version: integer("version").notNull(),
  data: text("data").notNull(), // JSON Assumptions
  createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("av_owner_ver").on(t.ownerId, t.version)]);

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  number: integer("number").notNull(),
  status: text("status").notNull(), // open | accepted | cancelled | rejected
  createdAt: text("created_at").notNull(),
  acceptedSeq: integer("accepted_seq"), // order of acceptance; drives the queue
  committedHours: real("committed_hours"),
});

export const quoteRevisions = sqliteTable("quote_revisions", {
  rowId: integer("row_id").primaryKey({ autoIncrement: true }),
  quoteId: text("quote_id").notNull(),
  rev: integer("rev").notNull(),
  assumptionsVersion: integer("assumptions_version").notNull(),
  committedLoadAtPricing: real("committed_load_at_pricing").notNull(),
  part: text("part").notNull(), // JSON Part
  result: text("result").notNull(), // JSON Quote
  createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("qr_quote_rev").on(t.quoteId, t.rev)]);

export const allocations = sqliteTable("allocations", {
  rowId: integer("row_id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  orderId: text("order_id").notNull(), // quote id, or BACKLOG
  week: integer("week").notNull(),
  hours: real("hours").notNull(),
});
