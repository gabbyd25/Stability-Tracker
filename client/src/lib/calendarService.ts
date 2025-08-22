import { TaskWithProduct } from "@shared/schema";

// Generate Microsoft Teams calendar link
export function generateTeamsLink(task: TaskWithProduct): string {
  const startDate = new Date(task.dueDate + 'T09:00:00');
  const endDate = new Date(task.dueDate + 'T10:00:00');
  
  const subject = encodeURIComponent(task.name);
  const body = encodeURIComponent(`Stability testing task for ${task.product.name}

Product: ${task.product.name}
Task Type: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}
Cycle: ${task.cycle || 'N/A'}
Assigned to: ${task.product.email}
Location: Laboratory`);
  
  // Format dates for Outlook web (works better than Teams direct link)
  const startTime = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endTime = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  // Use Outlook web calendar which integrates with Teams
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&body=${body}&startdt=${startTime}&enddt=${endTime}&location=Laboratory&to=${encodeURIComponent(task.product.email)}`;
}

// Generate Google Calendar link
export function generateGoogleCalendarLink(task: TaskWithProduct): string {
  const startDate = new Date(task.dueDate + 'T09:00:00');
  const endDate = new Date(task.dueDate + 'T10:00:00');
  
  const text = encodeURIComponent(task.name);
  const details = encodeURIComponent(`Stability testing task for ${task.product.name}

Product: ${task.product.name}
Task Type: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}
Cycle: ${task.cycle || 'N/A'}
Assigned to: ${task.product.email}`);
  
  const dates = `${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=Laboratory`;
}

// Generate .ics file content and trigger download
export function downloadIcsFile(task: TaskWithProduct): void {
  const startDate = new Date(task.dueDate + 'T09:00:00');
  const endDate = new Date(task.dueDate + 'T10:00:00');
  const now = new Date();
  
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Lab Stability Tracker//EN
BEGIN:VEVENT
UID:${task.id}@lab-stability-tracker.com
DTSTAMP:${formatDate(now)}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${task.name}
DESCRIPTION:Stability testing task for ${task.product.name}\\n\\nProduct: ${task.product.name}\\nTask Type: ${task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}\\nCycle: ${task.cycle || 'N/A'}\\nAssigned to: ${task.product.email}
LOCATION:Laboratory
ATTENDEE:MAILTO:${task.product.email}
BEGIN:VALARM
TRIGGER:-PT60M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${task.name}
END:VALARM
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${task.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}