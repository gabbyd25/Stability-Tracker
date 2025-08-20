import { TaskWithProduct } from "@shared/schema";

export async function sendEmailNotification(task: TaskWithProduct): Promise<void> {
  // Create ICS content for the single task
  const icsContent = generateTaskICS(task);
  
  // Create a downloadable ICS file (works with Outlook, Google Calendar, Apple Calendar)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const fileName = `${task.name.replace(/[^a-zA-Z0-9\s]/g, '-').replace(/\s+/g, '-')}-outlook-event.ics`;
  
  // Create download link
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = fileName;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Also create email content with instructions
  const subject = `Stability Task Due: ${task.name} - Calendar Event Attached`;
  const body = `Hi,

This is a reminder that you have a stability testing task due:

Task: ${task.name}
Product: ${task.product.name}
Due Date: ${new Date(task.dueDate).toLocaleDateString()}
Type: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}

A calendar file (.ics format) has been downloaded to your computer. This file works with all major calendar apps:

For OUTLOOK:
1. Double-click the downloaded .ics file
2. Outlook will open showing the event details
3. Click "Save & Close" to add it to your calendar

For GOOGLE CALENDAR:
1. Go to calendar.google.com
2. Click the "+" next to "Other calendars"
3. Select "Import" and choose the downloaded file

The reminder is set for 9:00 AM on the due date.

Please complete this task and mark it as done in your tracker.

Best regards,
Stability Testing System`;

  // Open default email app with pre-filled content
  const emailUrl = `mailto:${task.product.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(emailUrl);
}

function generateTaskICS(task: TaskWithProduct): string {
  const dueDate = new Date(task.dueDate);
  
  // Set reminder time to 9:00 AM on due date
  const startDateTime = new Date(dueDate);
  startDateTime.setHours(9, 0, 0, 0);
  
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(10, 0, 0, 0); // 1 hour duration

  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const startICS = formatICSDate(startDateTime);
  const endICS = formatICSDate(endDateTime);
  
  // Create unique ID
  const uid = `stability-${task.id}@stability-tracker`;
  
  // Task description with details
  const description = `Stability Testing Task\\n\\nProduct: ${task.product.name}\\nTask: ${task.name}\\nType: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}\\nCycle: ${task.cycle || 'N/A'}\\n\\nPlease complete this stability check and update your records.`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Stability Tracker//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Stability Testing
X-WR-TIMEZONE:America/New_York
BEGIN:VEVENT
UID:${uid}
DTSTART:${startICS}
DTEND:${endICS}
SUMMARY:${task.name}
DESCRIPTION:${description}
LOCATION:Laboratory
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
DESCRIPTION:Stability testing reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
