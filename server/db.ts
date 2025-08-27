import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

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
import { Product, Task, InsertProduct, InsertTask, TaskWithProduct, User, UpsertUser } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

  async getProducts(userId: string): Promise<Product[]> {
    return db.select().from(schema.products).where(eq(schema.products.userId, userId));
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