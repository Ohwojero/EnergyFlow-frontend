# EnergyFlow SaaS - Setup Guide

## Project Overview

EnergyFlow is a complete SaaS platform for managing LPG Gas Plants and Fuel Stations with two distinct plan types:

- **Personal Plan** (₦15,000/month): Single branch (Gas OR Fuel)
- **Organisation Plan** (₦20,000/month): Multiple branches (Gas & Fuel mixed)

## Application Flow

### 1. Landing Page (`/`)
- Shows features and pricing
- Users choose between Personal or Organisation plan
- Button redirects to plan selection modal

### 2. Plan Selection (`/`)
- Modal displays both plans side-by-side
- Personal: Single branch, basic features
- Organisation: Multiple branches, staff management, advanced analytics
- Selection redirects to signup page

### 3. Signup (`/signup?plan=personal` or `/signup?plan=organisation`)
- Register new account based on selected plan
- Collects: Business Name, Full Name, Email, Password
- Mock authentication for demo (replace with real backend)
- Auto-logs user into dashboard

### 4. Login (`/login`)
- Email & Password authentication
- Role selection (Super Admin, Org Owner, Gas Manager, Fuel Manager, Sales Staff)
- Branch selection based on role

### 5. Dashboard (`/dashboard`)
- Main dashboard with KPIs and metrics
- Dynamic sidebar based on user role
- Responsive design with mobile hamburger menu

## Role-Based Access Control

### Personal Plan
- **Gas Manager**: Manages single gas branch only
- **Fuel Manager**: Manages single fuel branch only

### Organisation Plan
- **Super Admin**: View all tenants, system settings
- **Org Owner**: Manage all branches, staff, compare performance
- **Gas Manager**: Manage assigned gas branches only
- **Fuel Manager**: Manage assigned fuel branches only
- **Sales Staff**: Record transactions at assigned branch

## File Structure

```
app/
├── (auth)/
│   ├── page.tsx           # Landing page
│   ├── login/page.tsx     # Login form
│   ├── signup/page.tsx    # Registration
│   └── layout.tsx         # Auth layout (no sidebar)
├── (dashboard)/
│   ├── layout.tsx         # Protected layout with sidebar
│   ├── dashboard/page.tsx # Main dashboard
│   ├── gas/               # Gas management pages
│   ├── fuel/              # Fuel management pages
│   ├── reports/           # Analytics
│   ├── users/             # Staff management
│   └── settings/          # Account settings
components/
├── auth/
│   ├── plan-selector.tsx  # Plan selection modal
├── layout/
│   ├── sidebar.tsx        # Navigation sidebar
│   ├── header.tsx         # Top header
│   └── mobile-nav.tsx     # Mobile menu
├── dashboard/
│   ├── metric-card.tsx    # KPI card component
│   ├── quick-stats.tsx    # Summary statistics
│   └── recent-transactions.tsx
└── ui/                    # shadcn/ui components
context/
└── auth-context.tsx       # Global auth state
