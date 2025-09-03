import { db } from "./db";
import { scheduleTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";

// Preset schedule templates for cosmetic testing
const presetTemplates = [
  {
    name: "Standard Cosmetic",
    description: "Standard stability testing for cosmetic products",
    testingIntervals: JSON.stringify([0, 1, 2, 4, 8, 13]), // Initial, Week 1, 2, 4, 8, 13
    isPreset: true,
  },
  {
    name: "Extended Stability",
    description: "Extended testing schedule for long-term stability",
    testingIntervals: JSON.stringify([0, 1, 2, 4, 8, 13, 26, 52]), // Include 6 months and 1 year
    isPreset: true,
  },
  {
    name: "Accelerated Testing",
    description: "Accelerated testing schedule for quick results",
    testingIntervals: JSON.stringify([0, 1, 2, 4, 6]), // Shorter testing period
    isPreset: true,
  },
  {
    name: "Monthly Testing",
    description: "Monthly testing intervals",
    testingIntervals: JSON.stringify([0, 4, 8, 13, 17, 26]), // Monthly-based testing
    isPreset: true,
  },
];

export async function seedPresetTemplates() {
  try {
    console.log("Seeding preset schedule templates...");
    
    // Check if presets already exist
    const existingPresets = await db.select().from(scheduleTemplates).where(eq(scheduleTemplates.isPreset, true));
    
    if (existingPresets.length === 0) {
      await db.insert(scheduleTemplates).values(presetTemplates);
      console.log(`Created ${presetTemplates.length} preset schedule templates`);
    } else {
      console.log(`Found ${existingPresets.length} existing preset templates, skipping seed`);
    }
  } catch (error) {
    console.error("Error seeding preset templates:", error);
  }
}