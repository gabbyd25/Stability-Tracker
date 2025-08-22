import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@shared/schema";

const sqlite = new Database("./database.sqlite");
export const db = drizzle(sqlite, { schema });

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    product_id TEXT NOT NULL REFERENCES products(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    due_date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    cycle TEXT,
    deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// SQLite storage implementation
import { IStorage } from "./storage";
import { Product, Task, InsertProduct, InsertTask, TaskWithProduct } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class SqliteStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return db.select().from(schema.products).all();
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
    return result || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(schema.products).values(insertProduct).returning().all();
    return product;
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(schema.tasks).where(eq(schema.tasks.deleted, false)).all();
  }

  async getTasksWithProducts(): Promise<TaskWithProduct[]> {
    const result = await db
      .select()
      .from(schema.tasks)
      .leftJoin(schema.products, eq(schema.tasks.productId, schema.products.id))
      .where(eq(schema.tasks.deleted, false))
      .all();

    return result.map(row => ({
      ...row.tasks,
      product: row.products!
    }));
  }

  async getDeletedTasks(): Promise<Task[]> {
    return db.select().from(schema.tasks).where(eq(schema.tasks.deleted, true)).all();
  }

  async getDeletedTasksWithProducts(): Promise<TaskWithProduct[]> {
    const result = await db
      .select()
      .from(schema.tasks)
      .leftJoin(schema.products, eq(schema.tasks.productId, schema.products.id))
      .where(eq(schema.tasks.deleted, true))
      .all();

    return result.map(row => ({
      ...row.tasks,
      product: row.products!
    }));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const result = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    return result || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(schema.tasks).values(insertTask).returning().all();
    return task;
  }

  async createTasks(insertTasks: InsertTask[]): Promise<Task[]> {
    const tasks = await db.insert(schema.tasks).values(insertTasks).returning().all();
    return tasks;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(schema.tasks)
      .set(updates)
      .where(eq(schema.tasks.id, id))
      .returning()
      .all();
    return updatedTask || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db
      .update(schema.tasks)
      .set({ 
        deleted: true, 
        deletedAt: new Date().toISOString() 
      })
      .where(eq(schema.tasks.id, id))
      .run();
    return result.changes > 0;
  }

  async restoreTask(id: string): Promise<Task | undefined> {
    const [restoredTask] = await db
      .update(schema.tasks)
      .set({ 
        deleted: false, 
        deletedAt: null 
      })
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.deleted, true)))
      .returning()
      .all();
    return restoredTask || undefined;
  }

  async permanentlyDeleteTask(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .run();
    return result.changes > 0;
  }

  async getTasksByProductId(productId: string): Promise<Task[]> {
    return db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.productId, productId), eq(schema.tasks.deleted, false)))
      .all();
  }
}