# Inventory Management System - Specification Document

## 1. Project Overview

- **Project Name**: Kantor Inventory Manager
- **Project Type**: Web Application (Single Page Application)
- **Core Functionality**: Office inventory management system for tracking monitors, keyboards, and mice with QR code generation and data export capabilities
- **Target Users**: Office administrators and inventory managers

---

## 2. UI/UX Specification

### Layout Structure

#### Login Page
- Centered login card on gradient background
- Company logo/icon at top
- Username and password input fields
- Login button
- Subtle animations on focus and hover

#### Dashboard (After Login)
- **Header**: Fixed top bar with logo, title "Kantor Inventory", user info, and logout button
- **Sidebar**: Fixed left sidebar (collapsible on mobile) with navigation menu
- **Main Content Area**: Dynamic content based on selected menu

#### Responsive Breakpoints
- **Desktop**: >= 1024px (sidebar visible, full layout)
- **Tablet**: 768px - 1023px (sidebar collapsible)
- **Mobile**: < 768px (hamburger menu, sidebar hidden by default)

### Visual Design

#### Color Palette
- **Primary**: #1a1a2e (Deep navy blue - main background)
- **Secondary**: #16213e (Darker blue - sidebar)
- **Accent**: #e94560 (Coral red - buttons, highlights)
- **Success**: #00d9a5 (Teal green - success states)
- **Warning**: #ffc107 (Amber - warnings)
- **Text Primary**: #ffffff (White)
- **Text Secondary**: #a0a0a0 (Gray)
- **Card Background**: #0f3460 (Navy blue)
- **Input Background**: #1a1a2e
- **Border**: #2a2a4a

#### Typography
- **Font Family**: 'Poppins', sans-serif (from Google Fonts)
- **Headings**: 
  - H1: 28px, weight 600
  - H2: 24px, weight 600
  - H3: 20px, weight 500
- **Body**: 14px, weight 400
- **Small**: 12px, weight 400

#### Spacing System
- **Base unit**: 8px
- **Margins**: 8px, 16px, 24px, 32px
- **Paddings**: 8px, 16px, 24px, 32px
- **Card padding**: 24px
- **Border radius**: 12px (cards), 8px (buttons), 6px (inputs)

#### Visual Effects
- **Card shadows**: 0 8px 32px rgba(0, 0, 0, 0.3)
- **Hover transitions**: 0.3s ease
- **Button hover**: scale(1.02) + brightness increase
- **Input focus**: glow effect with accent color
- **Sidebar items**: slide-in animation on hover
- **Page transitions**: fade-in effect (0.4s)

### Components

#### Login Page Components
1. **Login Card**
   - Centered, max-width 400px
   - Glassmorphism effect (semi-transparent)
   - Logo placeholder (icon)
   - Title: "Kantor Inventory"

2. **Input Fields**
   - Icon prefix (user/lock icons)
   - Placeholder text
   - Focus state with accent border glow

3. **Login Button**
   - Full width
   - Accent color background
   - Hover effect with scale

#### Dashboard Components

1. **Sidebar**
   - Width: 260px (desktop), full-width overlay (mobile)
   - Menu items with icons:
     - Dashboard (home icon)
     - Inventory (list icon)
     - Input Inventory (plus icon)
   - Active state with accent color left border
   - Hover state with slight background change

2. **Header**
   - Height: 64px
   - Logo and title on left
   - User avatar and name on right
   - Logout button

3. **Dashboard View**
   - Summary cards (4 cards in a row):
     - Total Items
     - Monitors
     - Keyboards
     - Mice
   - Each card shows icon, number, and label
   - Recent activity table

4. **Inventory View**
   - Search bar
   - Filter dropdown (All, Monitor, Keyboard, Mouse)
   - Data table with columns:
     - No.
     - Item Name
     - Category
     - Quantity
     - QR Code
     - Actions (View, Edit, Delete)
   - Export buttons (Excel, PDF)
   - Pagination

5. **Input Inventory View**
   - Form fields:
     - Item Name (text input)
     - Category (dropdown: Monitor, Keyboard, Mouse)
     - Quantity (number input)
     - Description (textarea)
     - Date (date picker)
   - Submit button
   - QR Code display area (generated after submit)
   - Print QR button

---

## 3. Functionality Specification

### Core Features

1. **Authentication**
   - Login with username and password
   - Demo credentials: admin / admin123
   - Session storage for login state
   - Logout functionality

2. **Dashboard**
   - Display summary statistics
   - Show recent inventory entries
   - Real-time updates when inventory changes

3. **Inventory Management**
   - View all inventory items in table format
   - Search by item name
   - Filter by category (Monitor, Keyboard, Mouse)
   - View item details with QR code
   - Edit existing items
   - Delete items with confirmation

4. **Input Inventory**
   - Add new inventory items
   - Auto-generate QR code for each item
   - QR code contains item ID and name
   - Display and print QR code

5. **Data Export**
   - Export to Excel (.xlsx format)
   - Export to PDF
   - Export current filtered view

6. **Responsive Design**
   - Fully functional on desktop
   - Fully functional on tablet
   - Fully functional on mobile
   - Touch-friendly on mobile devices

### User Interactions and Flows

1. **Login Flow**
   - User enters credentials
   - Validation check
   - Success: Redirect to dashboard
   - Failure: Show error message

2. **Add Item Flow**
   - User clicks "Input Inventory"
   - Fills in form details
   - Clicks "Submit"
   - Item saved to local storage
   - QR code generated and displayed
   - Success notification shown

3. **View/Edit Flow**
   - User clicks "View" on item row
   - Modal opens with item details
   - User can edit and save
   - Or delete with confirmation

4. **Export Flow**
   - User clicks export button
   - Data is formatted
   - File is downloaded

### Data Handling

- **Storage**: LocalStorage (browser-based)
- **Data Structure**:
```
json
{
  "id": "INV-001",
  "name": "Monitor Samsung 24 inch",
  "category": "Monitor",
  "quantity": 5,
  "description": "LED Monitor",
  "date": "2024-01-15",
  "qrCode": "data:image/png;base64,..."
}
```

### Edge Cases
- Empty inventory: Show "No items found" message
- Invalid login: Show error, don't redirect
- LocalStorage full: Show warning
- QR code generation failure: Show error message
- Export with no data: Disable export buttons

---

## 4. Technical Implementation

### Libraries (CDN)
- **QRCode.js**: QR code generation (https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js)
- **SheetJS (xlsx)**: Excel export (https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js)
- **jsPDF**: PDF export (https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js)
- **jsPDF-AutoTable**: PDF tables (https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js)
- **Google Fonts**: Poppins font

### File Structure
- index.html (single file containing all code)
  - Embedded CSS in `<style>` tag
  - Embedded JavaScript in `<script>` tag

---

## 5. Acceptance Criteria

### Visual Checkpoints
- [ ] Login page displays centered card with gradient background
- [ ] Sidebar shows 3 menu items with icons
- [ ] Dashboard shows 4 summary cards
- [ ] Inventory table displays all items with QR code column
- [ ] Input form has all required fields
- [ ] QR code displays after form submission
- [ ] Responsive: works on 320px width (mobile)
- [ ] All hover effects work smoothly

### Functional Checkpoints
- [ ] Login works with admin/admin123
- [ ] Invalid login shows error
- [ ] Can add new inventory item
- [ ] QR code generates correctly
- [ ] Can view inventory list
- [ ] Can filter by category
- [ ] Can search items
- [ ] Can export to Excel
- [ ] Can export to PDF
- [ ] Data persists after page refresh
- [ ] Logout returns to login page
