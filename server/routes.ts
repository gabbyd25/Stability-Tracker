import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertTaskSchema, insertScheduleTemplateSchema, insertFTCycleTemplateSchema } from "@shared/schema";
import { z } from "zod";
import { initAuth, requireUser } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  initAuth(app);
  
  // Auth routes
  app.get('/api/auth/user', requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Schedule Templates routes
  app.get("/api/schedule-templates", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getScheduleTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule templates" });
    }
  });

  app.get("/api/schedule-templates/presets", async (req, res) => {
    try {
      const presets = await storage.getPresetScheduleTemplates();
      res.json(presets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch preset templates" });
    }
  });

  app.post("/api/schedule-templates", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertScheduleTemplateSchema.parse(req.body);
      const template = await storage.createScheduleTemplate(validatedData, userId);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid template data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create schedule template" });
      }
    }
  });

  app.patch("/api/schedule-templates/:id", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      const updatedTemplate = await storage.updateScheduleTemplate(id, userId, updates);
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(updatedTemplate);
    } catch (error) {
      res.status(500).json({ message: "Failed to update schedule template" });
    }
  });

  app.delete("/api/schedule-templates/:id", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteScheduleTemplate(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error('Delete template error:', error);
      // Check if it's our custom error about templates being in use
      if (error instanceof Error && error.message.includes('currently being used')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete schedule template" });
    }
  });

  // F/T Cycle Templates routes
  app.get("/api/ft-cycle-templates", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getFTCycleTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch F/T cycle templates" });
    }
  });

  app.post("/api/ft-cycle-templates", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFTCycleTemplateSchema.parse(req.body);
      const template = await storage.createFTCycleTemplate(validatedData, userId);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid F/T cycle template data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create F/T cycle template" });
      }
    }
  });

  app.patch("/api/ft-cycle-templates/:id", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      const updatedTemplate = await storage.updateFTCycleTemplate(id, userId, updates);
      if (!updatedTemplate) {
        return res.status(404).json({ message: "F/T cycle template not found" });
      }
      res.json(updatedTemplate);
    } catch (error) {
      res.status(500).json({ message: "Failed to update F/T cycle template" });
    }
  });

  app.delete("/api/ft-cycle-templates/:id", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteFTCycleTemplate(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "F/T cycle template not found" });
      }
      res.json({ message: "F/T cycle template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete F/T cycle template" });
    }
  });

  // Get all products (protected)
  app.get("/api/products", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create new product (protected)
  app.post("/api/products", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Product creation request:', { userId, body: req.body });
      
      // Convert empty string scheduleTemplateId to null for database
      const cleanedBody = {
        ...req.body,
        scheduleTemplateId: req.body.scheduleTemplateId === '' ? null : req.body.scheduleTemplateId,
        ftTemplateId: req.body.ftTemplateId === '' ? null : req.body.ftTemplateId
      };
      
      const validatedData = insertProductSchema.parse(cleanedBody);
      console.log('Validated data:', validatedData);
      const product = await storage.createProduct(validatedData, userId);
      console.log('Product created successfully:', product);
      res.status(201).json(product);
    } catch (error) {
      console.error('Product creation error:', error);
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        console.error('Database or other error:', error);
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  // Get all tasks with products (protected)
  app.get("/api/tasks", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasksWithProducts(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create new task
  app.post("/api/tasks", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData, userId);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  // Create multiple tasks (protected)
  app.post("/api/tasks/batch", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) {
        return res.status(400).json({ message: "Tasks must be an array" });
      }
      
      const validatedTasks = tasks.map(task => insertTaskSchema.parse(task));
      const createdTasks = await storage.createTasks(validatedTasks, userId);
      res.status(201).json(createdTasks);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create tasks" });
      }
    }
  });

  // Update task (complete/uncomplete) - protected
  app.patch("/api/tasks/:id", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updates = req.body;
      
      // If marking as completed, add completedAt timestamp
      if (updates.completed && !updates.completedAt) {
        updates.completedAt = new Date();
      } else if (updates.completed === false) {
        updates.completedAt = null;
      }
      
      const updatedTask = await storage.updateTask(id, userId, updates);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Get deleted tasks (recycle bin) - protected
  app.get("/api/tasks/deleted", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deletedTasks = await storage.getDeletedTasksWithProducts(userId);
      res.json(deletedTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deleted tasks" });
    }
  });

  // Delete task (soft delete - move to recycle bin) - protected
  app.delete("/api/tasks/:id", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.deleteTask(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task moved to recycle bin" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Restore task from recycle bin - protected
  app.post("/api/tasks/:id/restore", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const restoredTask = await storage.restoreTask(id, userId);
      if (!restoredTask) {
        return res.status(404).json({ message: "Task not found in recycle bin" });
      }
      res.json(restoredTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to restore task" });
    }
  });

  // Permanently delete task - protected
  app.delete("/api/tasks/:id/permanent", requireUser(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const deleted = await storage.permanentlyDeleteTask(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task permanently deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to permanently delete task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
