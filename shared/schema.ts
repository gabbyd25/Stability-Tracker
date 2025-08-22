import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = sqliteTable("products", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  email: text("email").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'weekly', 'ft-thaw', 'ft-test'
  dueDate: text("due_date").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false),
  completedAt: text("completed_at"),
  cycle: text("cycle"), // 'Initial', 'Week 1', 'Cycle 1', etc.
  deleted: integer("deleted", { mode: "boolean" }).default(false),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export interface TaskWithProduct extends Task {
  product: Product;
}
