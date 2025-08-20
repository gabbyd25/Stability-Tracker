import { TaskWithProduct } from "@shared/schema";

export async function sendEmailNotification(task: TaskWithProduct): Promise<void> {
  // Create email content
  const subject = `Stability Task Due: ${task.name}`;
  const body = `Hi,

This is a reminder that you have a stability testing task due:

Task: ${task.name}
Product: ${task.product.name}
Due Date: ${new Date(task.dueDate).toLocaleDateString()}
Type: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}

Please complete this task and mark it as done in your tracker.

Best regards,
Stability Testing System`;

  // Open default email app with pre-filled content
  const emailUrl = `mailto:${task.product.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(emailUrl);
}
