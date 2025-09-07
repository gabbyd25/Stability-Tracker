import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { ftCycleTemplates } from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// PostgreSQL storage implementation
import { IStorage } from "./storage";
import { Product, Task, InsertProduct, InsertTask, TaskWithProduct, User, UpsertUser, ScheduleTemplate, InsertScheduleTemplate, ProductWithTemplate, FTCycleTemplate, InsertFTCycleTemplate } from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(userData)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Schedule Templates
  async getScheduleTemplates(userId: string): Promise<ScheduleTemplate[]> {
    return db.select().from(schema.scheduleTemplates).where(
      or(eq(schema.scheduleTemplates.userId, userId), eq(schema.scheduleTemplates.isPreset, true))
    );
  }

  async getScheduleTemplate(id: string, userId: string): Promise<ScheduleTemplate | undefined> {
    const [result] = await db.select().from(schema.scheduleTemplates).where(
      and(
        eq(schema.scheduleTemplates.id, id),
        or(eq(schema.scheduleTemplates.userId, userId), eq(schema.scheduleTemplates.isPreset, true))
      )
    );
    return result || undefined;
  }

  async createScheduleTemplate(insertTemplate: InsertScheduleTemplate, userId: string): Promise<ScheduleTemplate> {
    const [template] = await db.insert(schema.scheduleTemplates).values({
      ...insertTemplate,
      userId
    }).returning();
    return template;
  }

  async updateScheduleTemplate(id: string, userId: string, updates: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(schema.scheduleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.scheduleTemplates.id, id), eq(schema.scheduleTemplates.userId, userId)))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteScheduleTemplate(id: string, userId: string): Promise<boolean> {
    // First check if any products are using this template
    const productsUsingTemplate = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(eq(schema.products.scheduleTemplateId, id));
    
    if (productsUsingTemplate[0]?.count > 0) {
      throw new Error(`Cannot delete template. It is currently being used by ${productsUsingTemplate[0].count} product(s). Please remove the template from all products before deleting.`);
    }

    const result = await db
      .delete(schema.scheduleTemplates)
      .where(and(eq(schema.scheduleTemplates.id, id), eq(schema.scheduleTemplates.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getPresetScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return db.select().from(schema.scheduleTemplates).where(eq(schema.scheduleTemplates.isPreset, true));
  }

  // F/T Cycle Templates
  async getFTCycleTemplates(userId: string): Promise<FTCycleTemplate[]> {
    return db.select().from(schema.ftCycleTemplates).where(eq(schema.ftCycleTemplates.userId, userId));
  }

  async getFTCycleTemplate(id: string, userId: string): Promise<FTCycleTemplate | undefined> {
    const [result] = await db.select().from(schema.ftCycleTemplates).where(
      and(eq(schema.ftCycleTemplates.id, id), eq(schema.ftCycleTemplates.userId, userId))
    );
    return result || undefined;
  }

  async createFTCycleTemplate(insertTemplate: InsertFTCycleTemplate, userId: string): Promise<FTCycleTemplate> {
    const [template] = await db.insert(schema.ftCycleTemplates).values({
      ...insertTemplate,
      userId
    }).returning();
    return template;
  }

  async updateFTCycleTemplate(id: string, userId: string, updates: Partial<FTCycleTemplate>): Promise<FTCycleTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(schema.ftCycleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.ftCycleTemplates.id, id), eq(schema.ftCycleTemplates.userId, userId)))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteFTCycleTemplate(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(schema.ftCycleTemplates)
      .where(and(eq(schema.ftCycleTemplates.id, id), eq(schema.ftCycleTemplates.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Products
  async getProducts(userId: string): Promise<Product[]> {
    return db.select().from(schema.products).where(eq(schema.products.userId, userId));
  }

  async getProductsWithTemplates(userId: string): Promise<ProductWithTemplate[]> {
    const result = await db
      .select()
      .from(schema.products)
      .leftJoin(schema.scheduleTemplates, eq(schema.products.scheduleTemplateId, schema.scheduleTemplates.id))
      .where(eq(schema.products.userId, userId));

    return result.map(row => ({
      ...row.products,
      scheduleTemplate: row.schedule_templates || undefined
    }));
  }

  async getProduct(id: string, userId: string): Promise<Product | undefined> {
    const [result] = await db.select().from(schema.products).where(
      and(eq(schema.products.id, id), eq(schema.products.userId, userId))
    );
    return result || undefined;
  }

  async createProduct(insertProduct: InsertProduct, userId: string): Promise<Product> {
    const [product] = await db.insert(schema.products).values({
      ...insertProduct,
      userId
    }).returning();
    return product;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return db.select().from(schema.tasks).where(
      and(eq(schema.tasks.userId, userId), eq(schema.tasks.deleted, false))
    );
  }

  async getTasksWithProducts(userId: string): Promise<TaskWithProduct[]> {
    const result = await db
      .select()
      .from(schema.tasks)
      .leftJoin(schema.products, eq(schema.tasks.productId, schema.products.id))
      .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.deleted, false)));

    return result.map(row => ({
      ...row.tasks,
      product: row.products!
    }));
  }

  async getDeletedTasks(userId: string): Promise<Task[]> {
    return db.select().from(schema.tasks).where(
      and(eq(schema.tasks.userId, userId), eq(schema.tasks.deleted, true))
    );
  }

  async getDeletedTasksWithProducts(userId: string): Promise<TaskWithProduct[]> {
    const result = await db
      .select()
      .from(schema.tasks)
      .leftJoin(schema.products, eq(schema.tasks.productId, schema.products.id))
      .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.deleted, true)));

    return result.map(row => ({
      ...row.tasks,
      product: row.products!
    }));
  }

  async getTask(id: string, userId: string): Promise<Task | undefined> {
    const [result] = await db.select().from(schema.tasks).where(
      and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId))
    );
    return result || undefined;
  }

  async createTask(insertTask: InsertTask, userId: string): Promise<Task> {
    const [task] = await db.insert(schema.tasks).values({
      ...insertTask,
      userId
    }).returning();
    return task;
  }

  async createTasks(insertTasks: InsertTask[], userId: string): Promise<Task[]> {
    const tasksWithUserId = insertTasks.map(task => ({ ...task, userId }));
    const tasks = await db.insert(schema.tasks).values(tasksWithUserId).returning();
    return tasks;
  }

  async updateTask(id: string, userId: string, updates: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(schema.tasks)
      .set(updates)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)))
      .returning();
    return updatedTask || undefined;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(schema.tasks)
      .set({ 
        deleted: true, 
        deletedAt: new Date()
      })
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async restoreTask(id: string, userId: string): Promise<Task | undefined> {
    const [restoredTask] = await db
      .update(schema.tasks)
      .set({ 
        deleted: false, 
        deletedAt: null 
      })
      .where(and(
        eq(schema.tasks.id, id), 
        eq(schema.tasks.userId, userId),
        eq(schema.tasks.deleted, true)
      ))
      .returning();
    return restoredTask || undefined;
  }

  async permanentlyDeleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getTasksByProductId(productId: string, userId: string): Promise<Task[]> {
    return db
      .select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.productId, productId), 
        eq(schema.tasks.userId, userId),
        eq(schema.tasks.deleted, false)
      ));
  }
}