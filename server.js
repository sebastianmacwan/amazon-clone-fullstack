// Load environment variables from .env file
require("dotenv").config();

// Import necessary modules
const express = require("express");
const cors = require("cors"); // For Cross-Origin Resource Sharing
const bodyParser = require("body-parser"); // For parsing request bodies
const bcrypt = require("bcrypt"); // For password hashing
const nodemailer = require("nodemailer"); // For sending emails (contact form)
const multer = require("multer"); // For handling multipart/form-data (file uploads)
const path = require("path"); // For handling file paths

// Database connection pool (assuming db.js exports a pg.Pool instance)
const db = require("./config/db"); // Using 'db' for the pool as in your original code

// Configure Multer for file uploads (used in contact form)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize Express app
const app = express();

// --- Middleware Configuration ---

// Enable CORS for all routes. It's crucial to place this early.
// For development, '*' is fine. For production, restrict to your frontend's domain.
app.use(cors());

// Parse incoming request bodies in JSON format
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// --- Route Imports ---
// Import your product routes
const productsRouter = require("./routes/products");
// Import your cart routes
const cartRoutes = require('./routes/cart');

// --- Route Mounting ---
// Mount the products router under the /api path.
// If productsRouter handles '/products', the full path will be /api/products.
app.use("/api", productsRouter);
// Mount the cart router under the /api/cart path.
app.use('/api/cart', cartRoutes);


// ==========================
// Signup Route
// ==========================
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
        return res.status(400).json({ message: "All fields are required" });

    try {
        const existingUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "User already exists. Please login." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
            [username, email, hashedPassword]);

        res.status(201).json({ message: "Signup successful" });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Signup failed" });
    }
});

// ==========================
// Login Route
// ==========================
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0)
            return res.status(401).json({ message: "Invalid email or password" });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ message: "Invalid email or password" });

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ==========================
// Update Email Route
// ==========================
app.put("/api/user/update-email", async (req, res) => {
    const { id, newEmail } = req.body;

    if (!id || !newEmail)
        return res.status(400).json({ message: "User ID and new email required." });

    try {
        await db.query("UPDATE users SET email = $1 WHERE id = $2", [newEmail, id]);
        res.json({ message: "Email updated successfully." });
    } catch (err) {
        console.error("Update email error:", err);
        res.status(500).json({ message: "Failed to update email." });
    }
});

// ==========================
// Update Password Route
// ==========================
app.put("/api/user/update-password", async (req, res) => {
    const { id, oldPassword, newPassword } = req.body;

    if (!id || !oldPassword || !newPassword)
        return res.status(400).json({ message: "All fields are required." });

    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: "User not found." });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch)
            return res.status(401).json({ message: "Old password is incorrect." });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashedNewPassword, id]);

        res.json({ message: "Password updated successfully." });
    } catch (err) {
        console.error("Update password error:", err);
        res.status(500).json({ message: "Failed to update password." });
    }
});

// ==========================
// Contact Form Route
// ==========================
app.post("/send_mail", upload.single("file"), async (req, res) => {
    const { name, email, subject, message } = req.body;
    const file = req.file;

    if (!name || !email || !subject || !message)
        return res.status(400).json({ error: "All fields are required." });

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"${name}" <${process.env.MAIL_USER}>`,
            to: process.env.MAIL_RECEIVER,
            subject: subject,
            html: `
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong><br>${message}</p>
            `,
            attachments: file
                ? [{ filename: file.originalname, content: file.buffer }]
                : [],
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

// ==========================
// Fallback for SPA Routes
// ==========================
// This should be the very last route definition.
// It sends 'index.html' for any request that doesn't match previous routes,
// which is common for Single Page Applications (SPAs).
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Global Error Handling Middleware ---
// This middleware catches any errors that were not handled by specific routes.
app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err.stack); // Log the stack trace
    res.status(500).send('Something broke on the server!'); // Send a generic error response
});


// ==========================
// Start Server
// ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
