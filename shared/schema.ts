import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule templates table
export const scheduleTemplates = pgTable("schedule_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for system presets
  name: varchar("name").notNull(),
  description: varchar("description"),
  testingIntervals: varchar("testing_intervals").notNull(), // JSON array of week numbers
  isPreset: boolean("is_preset").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  startDate: varchar("start_date").notNull(),
  assignee: varchar("assignee").notNull(), // Person's name
  scheduleTemplateId: varchar("schedule_template_id").references(() => scheduleTemplates.id),
  ftCycleType: varchar("ft_cycle_type").notNull().default("consecutive"), // consecutive, weekly, biweekly, custom
  ftCycleCustom: varchar("ft_cycle_custom"), // JSON for custom F/T timing
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'weekly', 'ft-thaw', 'ft-test'
  dueDate: varchar("due_date").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  cycle: varchar("cycle"), // 'Initial', 'Week 1', 'Cycle 1', etc.
  deleted: boolean("deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export interface TaskWithProduct extends Task {
  product: Product;
}

export interface ProductWithTemplate extends Product {
  scheduleTemplate?: ScheduleTemplate;
}
