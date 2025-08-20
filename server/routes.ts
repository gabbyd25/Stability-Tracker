import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertTaskSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create new product
  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  // Get all tasks with products
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksWithProducts();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create new task
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  });

  // Create multiple tasks
  app.post("/api/tasks/batch", async (req, res) => {
    try {
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) {
        return res.status(400).json({ message: "Tasks must be an array" });
      }
      
      const validatedTasks = tasks.map(task => insertTaskSchema.parse(task));
      const createdTasks = await storage.createTasks(validatedTasks);
      res.status(201).json(createdTasks);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid task data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create tasks" });
      }
    }
  });

  // Update task (complete/uncomplete)
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // If marking as completed, add completedAt timestamp
      if (updates.completed && !updates.completedAt) {
        updates.completedAt = new Date();
      } else if (updates.completed === false) {
        updates.completedAt = null;
      }
      
      const updatedTask = await storage.updateTask(id, updates);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Get deleted tasks (recycle bin)
  app.get("/api/tasks/deleted", async (req, res) => {
    try {
      const deletedTasks = await storage.getDeletedTasksWithProducts();
      res.json(deletedTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deleted tasks" });
    }
  });

  // Delete task (soft delete - move to recycle bin)
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task moved to recycle bin" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Restore task from recycle bin
  app.post("/api/tasks/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;
      const restoredTask = await storage.restoreTask(id);
      if (!restoredTask) {
        return res.status(404).json({ message: "Task not found in recycle bin" });
      }
      res.json(restoredTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to restore task" });
    }
  });

  // Permanently delete task
  app.delete("/api/tasks/:id/permanent", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.permanentlyDeleteTask(id);
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
