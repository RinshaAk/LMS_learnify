# StackVerseHub — E-Learning Management System

> A production-oriented full-stack e-learning platform designed to connect **students, instructors, and administrators** through a secure, scalable, and interactive learning experience.

[![Live Demo](https://img.shields.io/badge/Live-Demo-success)](#) [![Frontend](https://img.shields.io/badge/Frontend-React.js-61DAFB)](#) [![Backend](https://img.shields.io/badge/Backend-Node.js-339933)](#) [![Database](https://img.shields.io/badge/Database-MongoDB-47A248)](#) [![License](https://img.shields.io/badge/License-MIT-blue)](#)

---

## Overview

**StackVerseHub** is a full-stack Learning Management System (LMS) built to provide a complete digital learning environment for students, instructors, and administrators.

The platform supports the complete learning lifecycle — from authentication and course management to payments, live classes, real-time communication, notifications, and certificate generation.

The project focuses on implementing real-world backend architecture, role-based authorization, secure authentication, third-party integrations, and real-time application features.

---

## Key Features

### Authentication & Authorization

* JWT-based authentication
* Google OAuth integration
* OTP-based verification
* Secure password handling
* Role-Based Access Control (RBAC)
* Protected API routes
* Separate workflows for Admin, Instructor, and Student

### Student Features

* Browse and explore courses
* Enroll in courses
* Secure course payments
* Access enrolled learning content
* Track learning progress
* Participate in live classes
* Real-time communication
* Receive notifications
* Generate course certificates

### Instructor Features

* Create and manage courses
* Manage course content
* Manage enrolled students
* Conduct live classes
* Communicate with students
* Monitor course activity

### Admin Features

* Manage users
* Manage instructors
* Manage courses
* Monitor platform activity
* Manage platform-level operations
* Role-based administrative access

### Real-Time Features

* Real-time chat using Socket.IO
* Real-time notifications
* Live classes using WebRTC
* Audio and video communication
* Screen sharing

### Payment Integration

* Razorpay payment gateway
* Secure payment workflow
* Course enrollment after successful payment

---

## Tech Stack

### Frontend

* React.js
* JavaScript (ES6+)
* Redux
* Tailwind CSS
* Axios
* Formik
* Yup

### Backend

* Node.js
* Express.js
* REST APIs
* JWT
* Google OAuth
* OTP Authentication
* Nodemailer
* Socket.IO
* WebRTC

### Database

* MongoDB
* Mongoose

### DevOps & Deployment

* AWS EC2
* Vercel
* Nginx
* PM2
* GitHub Actions
* Git & GitHub

### API & Development Tools

* Postman
* Git
* GitHub
* Axios

---

## System Architecture

```text
                    ┌──────────────────────┐
                    │       Client         │
                    │      React.js        │
                    └──────────┬───────────┘
                               │
                               │ HTTP / HTTPS
                               ▼
                    ┌──────────────────────┐
                    │      REST API        │
                    │   Node.js + Express  │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌──────────┐      ┌────────────┐    ┌────────────┐
       │ MongoDB  │      │  Socket.IO │    │  WebRTC    │
       │ Database │      │ Real-Time  │    │ Live Class │
       └──────────┘      └────────────┘    └────────────┘
                               │
                               ▼
                        ┌────────────┐
                        │  Razorpay  │
                        │  Payments  │
                        └────────────┘
```

---

## User Roles

| Role           | Responsibilities                                            |
| -------------- | ----------------------------------------------------------- |
| **Admin**      | Manage users, instructors, courses, and platform operations |
| **Instructor** | Create courses, manage content, conduct live classes        |
| **Student**    | Enroll in courses, learn, attend classes, communicate       |

---

## Application Flow

```text
User
 │
 ▼
Authentication
 │
 ├── Student
 │     ├── Browse Courses
 │     ├── Purchase Course
 │     ├── Learn
 │     ├── Attend Live Class
 │     └── Receive Certificate
 │
 ├── Instructor
 │     ├── Create Course
 │     ├── Manage Content
 │     ├── Manage Students
 │     └── Conduct Live Class
 │
 └── Admin
       ├── Manage Users
       ├── Manage Courses
       └── Monitor Platform
```

---

## Security

StackVerseHub implements multiple layers of application security:

* JWT authentication
* Protected API endpoints
* Role-based authorization
* Password hashing
* OTP verification
* OAuth authentication
* Environment-based configuration
* CORS configuration
* Server-side validation
* Secure payment verification

> Security-sensitive credentials and environment variables are never committed to the repository.

---

## Project Structure

```text
stackversehub/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   └── package.json
│
├── .gitignore
├── README.md
└── package.json
```

---

## REST API

StackVerseHub follows a modular REST API architecture.

Example API modules:

```text
/api/auth
/api/users
/api/courses
/api/admin
/api/instructors
/api/students
/api/payments
/api/chat
/api/live
```

The API layer is responsible for:

* Authentication
* Authorization
* Course management
* User management
* Enrollment
* Payments
* Communication
* Live-class functionality

---

## Real-Time Communication

StackVerseHub uses **Socket.IO** for real-time application functionality.

```text
Client
   │
   │ WebSocket
   ▼
Socket.IO Server
   │
   ├── Chat
   ├── Notifications
   └── Real-Time Events
```

This allows users to receive events without continuously polling the server.

---

## Live Classes

Live classroom functionality is implemented using **WebRTC**.

Supported functionality includes:

* Video communication
* Audio communication
* Screen sharing
* Real-time peer communication

The system combines WebRTC with signaling mechanisms to establish real-time connections between participants.

---

## Payment Flow

```text
Student
   │
   ▼
Select Course
   │
   ▼
Create Payment Order
   │
   ▼
Razorpay Checkout
   │
   ▼
Payment Verification
   │
   ▼
Enrollment
   │
   ▼
Course Access
```

---

## Deployment

### Frontend

The frontend can be deployed using platforms such as:

* Vercel

### Backend

The backend can be deployed using:

* AWS EC2
* PM2
* Nginx

Example production architecture:

```text
                    Internet
                       │
                       ▼
                    Nginx
                       │
                       ▼
                    PM2
                       │
                       ▼
                Node.js / Express
                       │
                       ▼
                    MongoDB
```

---

## Environment Variables

Create environment files for both frontend and backend.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

> Never commit `.env` files or production credentials to GitHub.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/stackversehub.git
cd stackversehub
```

### 2. Install Dependencies

```bash
npm install
```

If frontend and backend are separate applications:

```bash
cd frontend
npm install

cd ../backend
npm install
```

### 3. Configure Environment Variables

Create the required `.env` files and add your configuration.

### 4. Start the Backend

```bash
npm run dev
```

### 5. Start the Frontend

```bash
npm run dev
```

The application will then be available locally.

---

## Development Highlights

StackVerseHub was built with a focus on real-world full-stack development practices, including:

* Modular backend architecture
* RESTful API design
* Authentication and authorization
* Role-based access control
* Database modeling with Mongoose
* Third-party API integrations
* Real-time communication
* WebRTC-based functionality
* Payment integration
* Cloud deployment
* Reverse proxy configuration
* Process management with PM2
* Git-based development workflow

---

## Future Improvements

Planned improvements include:

* Automated testing
* API documentation with Swagger/OpenAPI
* Advanced monitoring and logging
* Redis caching
* Improved CI/CD pipeline
* Rate limiting
* Advanced analytics dashboard
* Recommendation system
* Improved scalability and performance
* Containerized deployment with Docker

---

## Screenshots

Add application screenshots here to showcase the major parts of the platform.

```text
docs/
└── screenshots/
    ├── landing-page.png
    ├── student-dashboard.png
    ├── instructor-dashboard.png
    ├── admin-dashboard.png
    ├── course-page.png
    └── live-class.png
```

---

## What I Learned

Building StackVerseHub provided practical experience in designing and developing a complete full-stack application.

Key areas of learning included:

* Designing REST APIs
* Implementing secure authentication
* Managing multiple user roles
* Building scalable backend services
* Working with MongoDB and Mongoose
* Integrating payment gateways
* Implementing real-time communication
* Understanding WebRTC
* Deploying applications to cloud infrastructure
* Debugging production and networking issues

---

## Author

### Fathima Rinsha AK

**MERN Stack Developer**

Focused on building scalable web applications using modern JavaScript technologies and production-oriented development practices.

* GitHub: [@your-username](https://github.com/RinshaAk)
* LinkedIn: [Fathima Rinsha](https://www.linkedin.com/in/rinshaak/)

---

## License

This project is licensed under the MIT License.

---

## Acknowledgements

Built as a full-stack engineering project to explore real-world application architecture, authentication, payments, real-time communication, and cloud deployment.
