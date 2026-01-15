# QRForge Backend - Node.js Custom Control

This is the custom backend for the QRForge generator. It handles dynamic QR redirection and scan analytics.

## Setup Instructions

1. **Install Dependencies**:
   Open a terminal in the `backend` folder and run:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`.

3. **How it works**:
   - **Dynamic QR**: When you create a dynamic QR in the frontend, it sends a request to the backend. The backend generates a short ID and returns a link like `http://localhost:3000/abc123`.
   - **Redirection**: When someone scans the QR/visits the link, the backend logs their device, OS, and timestamp, then redirects them to the target URL.
   - **Analytics**: The frontend fetches these scan logs to display real-time statistics in the Analytics dashboard.

## File Structure

- `server.js`: The main Express server and redirection logic.
- `db.json`: Local JSON database (automatically created on first run).
- `package.json`: Dependency list (`express`, `cors`, `shortid`, `ua-parser-js`).
