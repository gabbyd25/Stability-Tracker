import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import { ftCycleTemplates } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

const sqlite = new Database('stability.db');
export const db = drizzle(sqlite, { schema });

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
    // Check if user exists
    const existing = await this.getUser(userData.id);
    if (existing) {
      // Update existing user
      await db.update(schema.users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userData.id));
      return (await this.getUser(userData.id))!;
    } else {
      // Insert new user
      await db.insert(schema.users).values(userData);
      return (await this.getUser(userData.id))!;
    }
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
    const id = uuidv4();
    await db.insert(schema.scheduleTemplates).values({
      ...insertTemplate,
      id,
      userId
    });
    return (await this.getScheduleTemplate(id, userId))!;
  }

  async updateScheduleTemplate(id: string, userId: string, updates: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    await db
      .update(schema.scheduleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.scheduleTemplates.id, id), eq(schema.scheduleTemplates.userId, userId)));
    return await this.getScheduleTemplate(id, userId);
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
      .where(and(eq(schema.scheduleTemplates.id, id), eq(schema.scheduleTemplates.userId, userId)))
      .run();
    return result.changes > 0;
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
    const id = uuidv4();
    await db.insert(schema.ftCycleTemplates).values({
      ...insertTemplate,
      id,
      userId
    });
    return (await this.getFTCycleTemplate(id, userId))!;
  }

  async updateFTCycleTemplate(id: string, userId: string, updates: Partial<FTCycleTemplate>): Promise<FTCycleTemplate | undefined> {
    await db
      .update(schema.ftCycleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(schema.ftCycleTemplates.id, id), eq(schema.ftCycleTemplates.userId, userId)));
    return await this.getFTCycleTemplate(id, userId);
  }

  async deleteFTCycleTemplate(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(schema.ftCycleTemplates)
      .where(and(eq(schema.ftCycleTemplates.id, id), eq(schema.ftCycleTemplates.userId, userId)))
      .run();
    return result.changes > 0;
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
    const id = uuidv4();
    await db.insert(schema.products).values({
      ...insertProduct,
      id,
      userId
    });
    return (await this.getProduct(id, userId))!;
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
    const id = uuidv4();
    await db.insert(schema.tasks).values({
      ...insertTask,
      id,
      userId
    });
    return (await this.getTask(id, userId))!;
  }

  async createTasks(insertTasks: InsertTask[], userId: string): Promise<Task[]> {
    const tasksWithIds = insertTasks.map(task => ({ ...task, id: uuidv4(), userId }));
    for (const task of tasksWithIds) {
      await db.insert(schema.tasks).values(task);
    }
    return Promise.all(tasksWithIds.map(t => this.getTask(t.id, userId).then(task => task!)));
  }

  async updateTask(id: string, userId: string, updates: Partial<Task>): Promise<Task | undefined> {
    await db
      .update(schema.tasks)
      .set(updates)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)));
    return await this.getTask(id, userId);
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db
      .update(schema.tasks)
      .set({
        deleted: true,
        deletedAt: new Date()
      })
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)))
      .run();
    return result.changes > 0;
  }

  async restoreTask(id: string, userId: string): Promise<Task | undefined> {
    await db
      .update(schema.tasks)
      .set({
        deleted: false,
        deletedAt: null
      })
      .where(and(
        eq(schema.tasks.id, id),
        eq(schema.tasks.userId, userId),
        eq(schema.tasks.deleted, true)
      ));
    return await this.getTask(id, userId);
  }

  async permanentlyDeleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)))
      .run();
    return result.changes > 0;
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