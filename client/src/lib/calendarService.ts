import { TaskWithProduct } from "@shared/schema";

export async function exportToOutlookCalendar(tasks: TaskWithProduct[]): Promise<void> {
  // Create ICS (iCalendar) format for Outlook
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Stability Tracker//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Stability Testing
X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:Stability testing reminders for all products
`;

  tasks.forEach(task => {
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
    const description = `Stability Testing Task\\n\\nProduct: ${task.product.name}\\nTask: ${task.name}\\nType: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}\\nCycle: ${task.cycle}\\n\\nPlease complete this stability check and update your records.`;

    // Add event to ICS
    icsContent += `
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
END:VEVENT`;
  });

  icsContent += `
END:VCALENDAR`;

  // Create and download the file
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = 'stability-testing-calendar.ics';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
