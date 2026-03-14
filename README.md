Here's the updated README without the API Endpoints section:

---

```markdown
# CoreInventory-IMS

**CoreInventory** is a web-based Inventory Management System designed to digitize and streamline warehouse operations. Built for the **Odoo x Indus University Hackathon '26**, it replaces manual registers and Excel sheets with a centralized, real-time application for tracking receipts, deliveries, and stock movements.

---

## Features

### User Authentication
- User registration with unique username validation
- Secure login with JWT-based authentication
- Password strength validation
- Session management across all pages

### Dashboard
- Overview of total receipts and deliveries
- Quick access to pending operations
- Navigation to all system modules
- Real-time inventory status monitoring

### Receipts Management
- Automatic reference ID generation (WH/IN/0001 format)
- Vendor/supplier information tracking
- Product and quantity entry
- Workflow status: Draft → Ready → Done
- **Automatic stock update** when receipt is completed
- Creates new products automatically if they don't exist

### Deliveries Management
- Automatic reference ID generation (WH/OUT/0001 format)
- Customer and delivery address tracking
- Product and quantity selection
- Workflow status: Draft → Ready → Done
- **Stock validation** - prevents delivery if insufficient stock
- Displays available stock for each product

### Stock Management
- Real-time inventory visibility
- Product name, SKU, and quantity tracking
- On Hand and Free to Use quantities
- Inline editing for stock adjustments
- Validation: Free to Use cannot exceed On Hand
- Add new stock (creates product if not exists)

### Move History
- Complete audit trail of inventory movements
- Tracks all receipts and deliveries
- Records: Reference, Date, Product, Quantity, Source/Destination
- Filter by movement type

### Settings
- **Warehouse Management** - Create and manage warehouses
- **Location Management** - Define storage locations within warehouses

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, TailwindCSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Authentication | JWT (JSON Web Tokens) |
| Icons | Material Symbols |

---

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (Node Package Manager)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/username/CoreInventory-IMS.git
   cd CoreInventory-IMS
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `backend` folder:
   ```env
   JWT_SECRET=your-secret-key-here
   PORT=3000
   ```

4. **Start the backend server**
   ```bash
   npm start
   ```
   Server runs at `http://localhost:3000`

5. **Open the frontend**
   
   Open `frontend/index.html` in a browser, or use a local server:
   ```bash
   # Using VS Code Live Server extension, or
   npx serve frontend
   ```

---

## Project Structure

```
CoreInventory-IMS/
├── backend/
│   ├── server.js        # Express API server
│   ├── database.js      # SQLite database setup
│   ├── auth.js          # JWT authentication middleware
│   └── .env             # Environment variables
├── frontend/
│   ├── index.html       # Login page
│   ├── signup.html      # Registration page
│   ├── saas-dashboard.html
│   ├── receipts.html
│   ├── receipt-form.html
│   ├── delivery.html
│   ├── delivery-form.html
│   ├── stock.html
│   ├── move-history.html
│   ├── settings.html
│   ├── warehouse.html
│   ├── location.html
│   ├── api.js           # API client functions
│   └── auth-check.js    # Authentication utilities
└── README.md
```

---

## System Workflow

```
Vendor → Receipt (WH/IN) → Stock → Delivery (WH/OUT) → Customer
                              ↓
                        Move History (Audit Trail)
```

- **Receipts** add items to stock when marked as "Done"
- **Deliveries** deduct stock when marked as "Done"
- **Stock validation** ensures deliveries cannot exceed available stock
- All movements are recorded in **Move History**

---

## Key Highlights

- **Real-time stock tracking** with automatic updates
- **Stock validation** prevents overselling
- **Product auto-creation** when receiving new items
- **JWT authentication** for secure access
- **Responsive design** works on desktop and mobile
- **Audit trail** for all inventory movements

---

## License

This project was developed for the Odoo x Indus University Hackathon '26.
```

---
