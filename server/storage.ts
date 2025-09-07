import { type Product, type InsertProduct, type Task, type InsertTask, type TaskWithProduct, type User, type UpsertUser, type ScheduleTemplate, type InsertScheduleTemplate, type ProductWithTemplate, type FTCycleTemplate, type InsertFTCycleTemplate } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Schedule Templates
  getScheduleTemplates(userId: string): Promise<ScheduleTemplate[]>;
  getScheduleTemplate(id: string, userId: string): Promise<ScheduleTemplate | undefined>;
  createScheduleTemplate(template: InsertScheduleTemplate, userId: string): Promise<ScheduleTemplate>;
  updateScheduleTemplate(id: string, userId: string, updates: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | undefined>;
  deleteScheduleTemplate(id: string, userId: string): Promise<boolean>;
  getPresetScheduleTemplates(): Promise<ScheduleTemplate[]>;

  // F/T Cycle Templates
  getFTCycleTemplates(userId: string): Promise<FTCycleTemplate[]>;
  getFTCycleTemplate(id: string, userId: string): Promise<FTCycleTemplate | undefined>;
  createFTCycleTemplate(template: InsertFTCycleTemplate, userId: string): Promise<FTCycleTemplate>;
  updateFTCycleTemplate(id: string, userId: string, updates: Partial<FTCycleTemplate>): Promise<FTCycleTemplate | undefined>;
  deleteFTCycleTemplate(id: string, userId: string): Promise<boolean>;

  // Products
  getProducts(userId: string): Promise<Product[]>;
  getProductsWithTemplates(userId: string): Promise<ProductWithTemplate[]>;
  getProduct(id: string, userId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct, userId: string): Promise<Product>;
  
  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  getTasksWithProducts(userId: string): Promise<TaskWithProduct[]>;
  getDeletedTasks(userId: string): Promise<Task[]>;
  getDeletedTasksWithProducts(userId: string): Promise<TaskWithProduct[]>;
  getTask(id: string, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask, userId: string): Promise<Task>;
  createTasks(tasks: InsertTask[], userId: string): Promise<Task[]>;
  updateTask(id: string, userId: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<boolean>;
  restoreTask(id: string, userId: string): Promise<Task | undefined>;
  permanentlyDeleteTask(id: string, userId: string): Promise<boolean>;
  getTasksByProductId(productId: string, userId: string): Promise<Task[]>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private tasks: Map<string, Task>;
  private users: Map<string, User>;
  private scheduleTemplates: Map<string, ScheduleTemplate>;
  private ftCycleTemplates: Map<string, FTCycleTemplate>;

  constructor() {
    this.products = new Map();
    this.tasks = new Map();
    this.users = new Map();
    this.scheduleTemplates = new Map();
    this.ftCycleTemplates = new Map();
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!userData.id) {
      throw new Error("User ID is required for upsert operation");
    }
    
    const existingUser = this.users.get(userData.id);
    if (existingUser) {
      const updatedUser = { 
        ...existingUser, 
        email: userData.email ?? existingUser.email,
        firstName: userData.firstName ?? existingUser.firstName,
        lastName: userData.lastName ?? existingUser.lastName,
        profileImageUrl: userData.profileImageUrl ?? existingUser.profileImageUrl,
        updatedAt: new Date() 
      };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        id: userData.id,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userData.id, newUser);
      return newUser;
    }
  }

  // Schedule Templates
  async getScheduleTemplates(userId: string): Promise<ScheduleTemplate[]> {
    return Array.from(this.scheduleTemplates.values()).filter(t => t.userId === userId || t.isPreset);
  }

  async getScheduleTemplate(id: string, userId: string): Promise<ScheduleTemplate | undefined> {
    const template = this.scheduleTemplates.get(id);
    if (template && (template.userId === userId || template.isPreset)) {
      return template;
    }
    return undefined;
  }

  async createScheduleTemplate(insertTemplate: InsertScheduleTemplate, userId: string): Promise<ScheduleTemplate> {
    const id = randomUUID();
    const template: ScheduleTemplate = {
      id,
      name: insertTemplate.name,
      testingIntervals: insertTemplate.testingIntervals,
      description: insertTemplate.description ?? null,
      isPreset: insertTemplate.isPreset ?? false,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scheduleTemplates.set(id, template);
    return template;
  }

  async updateScheduleTemplate(id: string, userId: string, updates: Partial<ScheduleTemplate>): Promise<ScheduleTemplate | undefined> {
    const template = this.scheduleTemplates.get(id);
    if (!template || template.userId !== userId) return undefined;
    
    const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
    this.scheduleTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteScheduleTemplate(id: string, userId: string): Promise<boolean> {
    const template = this.scheduleTemplates.get(id);
    console.log('Delete template storage:', { 
      templateId: id, 
      requestUserId: userId, 
      templateExists: !!template,
      templateUserId: template?.userId,
      templateIsPreset: template?.isPreset 
    });
    
    if (!template) {
      console.log('Template not found');
      return false;
    }
    
    if (template.userId !== userId) {
      console.log('User ID mismatch or template is preset');
      return false;
    }
    
    const deleteResult = this.scheduleTemplates.delete(id);
    console.log('Delete operation result:', deleteResult);
    return deleteResult;
  }

  async getPresetScheduleTemplates(): Promise<ScheduleTemplate[]> {
    return Array.from(this.scheduleTemplates.values()).filter(t => t.isPreset);
  }

  // F/T Cycle Templates
  async getFTCycleTemplates(userId: string): Promise<FTCycleTemplate[]> {
    return Array.from(this.ftCycleTemplates.values()).filter(t => t.userId === userId);
  }

  async getFTCycleTemplate(id: string, userId: string): Promise<FTCycleTemplate | undefined> {
    const template = this.ftCycleTemplates.get(id);
    if (template && template.userId === userId) {
      return template;
    }
    return undefined;
  }

  async createFTCycleTemplate(insertTemplate: InsertFTCycleTemplate, userId: string): Promise<FTCycleTemplate> {
    const id = randomUUID();
    const template: FTCycleTemplate = {
      id,
      name: insertTemplate.name,
      cycles: insertTemplate.cycles,
      description: insertTemplate.description ?? null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ftCycleTemplates.set(id, template);
    return template;
  }

  async updateFTCycleTemplate(id: string, userId: string, updates: Partial<FTCycleTemplate>): Promise<FTCycleTemplate | undefined> {
    const template = this.ftCycleTemplates.get(id);
    if (!template || template.userId !== userId) return undefined;
    
    const updatedTemplate = { ...template, ...updates, updatedAt: new Date() };
    this.ftCycleTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteFTCycleTemplate(id: string, userId: string): Promise<boolean> {
    const template = this.ftCycleTemplates.get(id);
    if (!template || template.userId !== userId) return false;
    
    return this.ftCycleTemplates.delete(id);
  }

  // Products
  async getProducts(userId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.userId === userId);
  }

  async getProductsWithTemplates(userId: string): Promise<ProductWithTemplate[]> {
    const products = Array.from(this.products.values()).filter(p => p.userId === userId);
    const productsWithTemplates: ProductWithTemplate[] = [];
    
    for (const product of products) {
      let scheduleTemplate = undefined;
      if (product.scheduleTemplateId) {
        scheduleTemplate = this.scheduleTemplates.get(product.scheduleTemplateId);
      }
      productsWithTemplates.push({ ...product, scheduleTemplate });
    }
    
    return productsWithTemplates;
  }

  async getProduct(id: string, userId: string): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (product && product.userId === userId) {
      return product;
    }
    return undefined;
  }

  async createProduct(insertProduct: InsertProduct, userId: string): Promise<Product> {
    const id = randomUUID();
    const product: Product = { 
      id,
      name: insertProduct.name,
      startDate: insertProduct.startDate,
      assignee: insertProduct.assignee,
      scheduleTemplateId: insertProduct.scheduleTemplateId ?? null,
      ftCycleType: insertProduct.ftCycleType ?? "consecutive",
      ftCycleCustom: insertProduct.ftCycleCustom ?? null,
      userId,
      createdAt: new Date()
    };
    this.products.set(id, product);
    return product;
  }

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId && !task.deleted);
  }

  async getTasksWithProducts(userId: string): Promise<TaskWithProduct[]> {
    const tasks = Array.from(this.tasks.values()).filter(task => task.userId === userId && !task.deleted);
    const tasksWithProducts: TaskWithProduct[] = [];
    
    for (const task of tasks) {
      const product = this.products.get(task.productId);
      if (product) {
        tasksWithProducts.push({ ...task, product });
      }
    }
    
    return tasksWithProducts;
  }

  async getDeletedTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId && task.deleted);
  }

  async getDeletedTasksWithProducts(userId: string): Promise<TaskWithProduct[]> {
    const tasks = Array.from(this.tasks.values()).filter(task => task.userId === userId && task.deleted);
    const tasksWithProducts: TaskWithProduct[] = [];
    
    for (const task of tasks) {
      const product = this.products.get(task.productId);
      if (product) {
        tasksWithProducts.push({ ...task, product });
      }
    }
    
    return tasksWithProducts;
  }

  async getTask(id: string, userId: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (task && task.userId === userId) {
      return task;
    }
    return undefined;
  }

  async createTask(insertTask: InsertTask, userId: string): Promise<Task> {
    const id = randomUUID();
    const task: Task = { 
      ...insertTask, 
      id,
      userId,
      createdAt: new Date(),
      completed: insertTask.completed ?? false,
      completedAt: insertTask.completedAt ?? null,
      cycle: insertTask.cycle ?? null,
      deleted: false,
      deletedAt: null
    };
    this.tasks.set(id, task);
    return task;
  }

  async createTasks(insertTasks: InsertTask[], userId: string): Promise<Task[]> {
    const createdTasks: Task[] = [];
    for (const insertTask of insertTasks) {
      const task = await this.createTask(insertTask, userId);
      createdTasks.push(task);
    }
    return createdTasks;
  }

  async updateTask(id: string, userId: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId) return false;
    
    const updatedTask = { 
      ...task, 
      deleted: true, 
      deletedAt: new Date() 
    };
    this.tasks.set(id, updatedTask);
    return true;
  }

  async restoreTask(id: string, userId: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId || !task.deleted) return undefined;
    
    const restoredTask = { 
      ...task, 
      deleted: false, 
      deletedAt: null 
    };
    this.tasks.set(id, restoredTask);
    return restoredTask;
  }

  async permanentlyDeleteTask(id: string, userId: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId) return false;
    return this.tasks.delete(id);
  }

  async getTasksByProductId(productId: string, userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.productId === productId && task.userId === userId && !task.deleted);
  }
}

// Use PostgreSQL with authentication
import { DatabaseStorage } from "./db";
export const storage = new DatabaseStorage();
