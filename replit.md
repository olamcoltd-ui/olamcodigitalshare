# Overview

This is a full-stack digital marketplace application called "Olamco Digital Hub" built for selling and sharing digital products like ebooks, audio files, courses, stock photos, and movies. The platform features a comprehensive referral system with tiered commission structures based on subscription plans, user management, product management, and payment processing through Paystack. It's designed as a modern web application with a React frontend and Express backend, using PostgreSQL for data persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack Monorepo Structure
The application follows a monorepo architecture with clearly separated client and server code:
- **Client**: React SPA with TypeScript located in `/client`
- **Server**: Express.js API server with TypeScript in `/server`
- **Shared**: Common schemas and types in `/shared`
- **Database**: PostgreSQL with Drizzle ORM for schema management

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/building
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **State Management**: TanStack React Query for server state, React Context for authentication
- **Routing**: React Router for client-side navigation
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Supabase Auth with custom profile management
- **File Storage**: Supabase Storage for product files and thumbnails

## Database Schema Design
The application uses three core entities:
- **Profiles**: Extended user data including referral codes, bank details, and admin flags
- **Products**: Digital products with metadata, pricing, and file references
- **Sales**: Transaction records with commission tracking and referral attribution

## Authentication System
- **Provider**: Supabase Auth for user registration, login, and session management
- **Profile Management**: Custom profile creation with referral code generation
- **Authorization**: Role-based access with admin flags and route protection

## Payment Processing
- **Provider**: Paystack for Nigerian market payment processing
- **Webhook Integration**: Automated transaction verification and commission distribution
- **Bank Verification**: Real-time account verification through Paystack API

## Referral and Commission System
- **Tiered Structure**: Commission rates based on subscription plans (20%-50%)
- **Tracking**: Automatic referral attribution through URL parameters
- **Payouts**: Automated commission calculation and withdrawal processing

# External Dependencies

## Core Services
- **Supabase**: Authentication, database hosting, file storage, and edge functions
- **Neon Database**: Serverless PostgreSQL database provider
- **Paystack**: Payment processing and bank verification for Nigerian market

## Development Tools
- **Vite**: Frontend build tool and development server
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across the entire application

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless component primitives
- **Shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library

## State and Data Management
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting