import { type Product, type InsertProduct, type Task, type InsertTask, type TaskWithProduct } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksWithProducts(): Promise<TaskWithProduct[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  createTasks(tasks: InsertTask[]): Promise<Task[]>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  getTasksByProductId(productId: string): Promise<Task[]>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private tasks: Map<string, Task>;

  constructor() {
    this.products = new Map();
    this.tasks = new Map();
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { 
      ...insertProduct, 
      id,
      createdAt: new Date()
    };
    this.products.set(id, product);
    return product;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksWithProducts(): Promise<TaskWithProduct[]> {
    const tasks = Array.from(this.tasks.values());
    const tasksWithProducts: TaskWithProduct[] = [];
    
    for (const task of tasks) {
      const product = this.products.get(task.productId);
      if (product) {
        tasksWithProducts.push({ ...task, product });
      }
    }
    
    return tasksWithProducts;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = { 
      ...insertTask, 
      id,
      createdAt: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }

  async createTasks(insertTasks: InsertTask[]): Promise<Task[]> {
    const createdTasks: Task[] = [];
    for (const insertTask of insertTasks) {
      const task = await this.createTask(insertTask);
      createdTasks.push(task);
    }
    return createdTasks;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getTasksByProductId(productId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.productId === productId);
  }
}

export const storage = new MemStorage();
