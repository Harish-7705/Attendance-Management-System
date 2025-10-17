# 🚀 ALMS - Attendance & Leave Management System

A comprehensive, web-based **Attendance & Leave Management System (ALMS)** designed for efficient employee management, attendance tracking, and detailed analytics. Developed specifically for **Chennai Metro Rail Limited (CMRL)** with a focus on usability, security, and performance.

---

## 📌 Features

### 🏢 Branding
- Corporate-grade design with consistent branding
- Responsive layout for desktops, tablets, and mobile devices

### 👥 User Management
- Role-based access (Admin, Manager, Employee)
- Secure authentication
- Employee profile handling
- Department-wise user organization

### ⏰ Attendance Tracking
- Real-time attendance marking
- Multiple attendance states (Present, Late, Absent, Half-day)
- Timestamp logging
- Support for custom remarks

### 📊 Dashboard & Analytics
- Real-time visual data insights
- Interactive charts (via Chart.js)
- Recent activity feed
- Quick access buttons

### 📈 Reports
- Daily, weekly, monthly, and department-wise reports
- Export functionality (CSV/PDF in future)
- Attendance trends and filtering

### ⚙️ System Settings
- Configurable working hours and grace periods
- Notification preferences
- Security and session settings

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Styling | Custom CSS, CSS Variables |
| Fonts | Google Fonts (Roboto) |
| Icons | Font Awesome 6 |
| Charts | Chart.js (optional integration) |
| Authentication | Session-based login with role control |

---

## 📁 File Structure

Attandance_management/
├── index.html # Main interface
├── login.html # Login page
├── styles.css # CMRL-branded styles
├── script.js # Core functionality
└── README.md # Project documentation


---

## 🚀 Getting Started

### 1. Setup
- Clone or download the project to your web server directory
- Ensure all files are in the same directory
- Open `login.html` in a modern browser

### 2. Demo Credentials

| Role     | Username   | Password     | Access Level              |
|----------|------------|--------------|---------------------------|
| Admin    | `admin`    | `admin123`   | Full system access        |
| Manager  | `manager`  | `manager123` | Reports & attendance view |
| Employee | `employee` | `employee123`| Attendance marking only   |

---

## 🧭 Navigation Guide

- **Dashboard** – Overview & statistics  
- **Attendance** – Mark/view daily attendance  
- **Employees** – Manage profiles (Admin only)  
- **Reports** – Generate filters-based reports (Manager/Admin)  
- **Settings** – System configurations (Admin only)

---

## 👤 Usage Guide

### 👨‍💼 For Admins
- Add/edit/delete employees
- Configure system settings (hours, notifications, grace)
- View all reports and attendance data

### 👩‍💼 For Managers
- Monitor attendance for their department
- Generate and export reports
- Approve/decline leave requests

### 👨‍🔧 For Employees
- Mark daily attendance
- Track their own attendance history
- Submit leave requests

---

## 🎨 Customization

### 🎨 Color Theme
Modify `:root` variables in `styles.css` for branding:

##css
:root {
    --cmrl-blue: #006FAF;
    --cmrl-dark-blue: #004A7C;
    --cmrl-light-blue: #E6F3FF;
}
###📅 System Flowchart

flowchart TD
  A[Login] --> B[Dashboard]
  B --> C[Attendance Module\n- Capture Sign-in / Sign-out]
  B --> D[Employee Master\n- Capture Employee Details]
  B --> E[Leave Master\n- Define Leave Types\n- Track Leave Balance]
  B --> F[Holiday Master\n- Define Annual Holidays]
  E --> G[Leave Apply\n- Employee Leave Applications]
  G --> H[Leave Sanction\n- Approve/Reject]
  B --> I[Reports]
  I --> J[Attendance Reports]
  I --> K[Leave Reports]

###🚧 Future Enhancements

 Biometric device integration
 Mobile app version (Android/iOS)
 Export to PDF
 Email alerts and reminders
 Backend integration (MySQL/PostgreSQL)
 REST API support
 Multi-language support
 Advanced analytics dashboard

 
