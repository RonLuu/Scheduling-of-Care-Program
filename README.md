# Scheduling-of-Care-Program

A group project for COMP30022

A MERN stack application (MongoDB, Express, React, Node.js) with a Vite-powered React frontend.  
This project provides scheduling and management features for care tasks.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- npm (comes with Node.js)
- MongoDB (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas))

---

### Run the App

**1. Start the Client (Frontend)**

````bash
cd client
npm install
npm run build


**2. Start the Server (Backend)**
Open a new terminal:
```bash
cd server
npm install
npm run dev

backend will run on http://localhost:3000 and the frontend will be served from the built files.

---- OR -----
Run the App (One command)

In the root folder:
npm i
npm run start

UI: http://localhost:3000
API: http://localhost:3000/api/*

_______
Environment Variables
Create .env files as follows:

Server (server/.env):
PORT=3000
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
TOKEN_PEPPER=your-secret-token-pepper

Client (client/.env):
VITE_API_URL=http://localhost:3000


_______
MongoDB Atlas Setup (Optional)

If you don’t want to run MongoDB locally:

Sign up at MongoDB Atlas and create a free cluster.

Create a database user and whitelist your IP.

Copy the connection string (e.g. mongodb+srv://<user>:<password>@cluster0.mongodb.net/care-scheduler).

Paste it into the MONGO_URI in server/.env.
````
