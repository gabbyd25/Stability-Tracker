# Stability Testing Tracker

## Overview

This is a laboratory stability testing management application built with React, Express.js, and PostgreSQL. The application helps laboratory professionals track and manage stability testing schedules for various products, automatically generating testing tasks based on FDA stability testing protocols. It features intelligent scheduling for weekly tests and freeze/thaw cycles, automated email notifications, and calendar integration for Outlook.

The system is designed to streamline the complex process of stability testing compliance by providing automated task generation, visual progress tracking, and comprehensive reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.
Calendar integration: Enhanced Outlook calendar integration with downloadable .ics files for individual tasks and bulk export.
Testing schedule: Removed Week 3 from stability testing protocol (now: Initial, Week 1, Week 2, Week 4, Week 8, Week 13).

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Notifications**: Custom toast system using Radix UI Toast primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API with JSON responses and proper HTTP status codes
- **Error Handling**: Centralized error handling middleware with structured error responses
- **Request Processing**: JSON and URL-encoded body parsing with request logging middleware
- **Development Tools**: Hot module replacement via Vite integration for seamless development

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting
- **In-Memory Storage**: Fallback MemStorage implementation for development/testing scenarios
- **Data Models**: 
  - Products table with name, start date, email, and timestamps
  - Tasks table with product relationships, task types, due dates, completion status, and cycle information

### Authentication and Authorization
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Security**: Basic session-based authentication (authentication components not yet implemented)
- **CORS**: Configured for development and production environments

### External Service Integrations

#### Email Services
- **Email Notifications**: Browser-based mailto integration for sending task reminders
- **Template System**: Pre-formatted email templates with task details and product information
- **Recipient Management**: Email addresses stored per product for automated notifications

#### Calendar Integration
- **Outlook Calendar**: ICS (iCalendar) format export for importing stability testing schedules
- **Event Generation**: Automated creation of calendar events with proper timing and descriptions
- **Reminder System**: Built-in alarm notifications set for 9:00 AM on task due dates

#### Task Generation Engine
- **FDA Protocol Compliance**: Automated generation of stability testing tasks following standard protocols
- **Weekly Testing**: Recurring weekly tasks for ongoing stability monitoring
- **Freeze/Thaw Cycles**: Specialized task creation for freeze/thaw stability testing
- **Intelligent Scheduling**: Date-based task scheduling with proper cycle management

### Development and Build Tools
- **Build System**: Vite for frontend bundling with esbuild for server-side bundling
- **TypeScript Configuration**: Strict type checking with path mapping for clean imports
- **Code Quality**: ESLint and Prettier configuration (implied by project structure)
- **Hot Reload**: Development server with hot module replacement for rapid iteration
- **Asset Management**: Static asset serving with proper caching headers