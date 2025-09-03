import { db } from "./db";
import { scheduleTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

// Standard template for cosmetic testing (only one preset)

export async function seedPresetTemplates() {
  try {
    console.log("Seeding standard template...");
    
    // Check if standard template already exists
    const existingStandard = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.isPreset, true));
    
    if (existingStandard.length === 0) {
      // Only create the Standard template as default
      const standardTemplate = {
        name: "Standard",
        description: "Standard cosmetic stability testing (Initial, Week 1, 2, 4, 8, 13)",
        testingIntervals: JSON.stringify([0, 1, 2, 4, 8, 13]),
        isPreset: true,
      };
      
      await db.insert(scheduleTemplates).values([standardTemplate]);
      console.log("Created standard schedule template");
    } else {
      console.log("Found existing standard template, skipping seed");
    }
  } catch (error) {
    console.error("Error seeding standard template:", error);
  }
}