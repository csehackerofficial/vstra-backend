const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// --- AUTH ROUTES ---
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
        res.json({ success: true, message: "Registered Successfully." });
    } catch (err) { res.status(400).json({ success: false, message: "Error: Email might exist." }); }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });
        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (isMatch) {
            const role = (email === "kumaraayush7501@gmail.com") ? "admin" : "user";
            res.json({ success: true, user: { name: rows[0].name, email: rows[0].email, role } });
        } else { res.status(401).json({ success: false, message: "Invalid credentials." }); }
    } catch (err) { res.status(500).json({ success: false }); }
});

// --- INVENTORY ROUTES ---
app.get("/api/products", async (req, res) => {
    const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(rows);
});

// --- PASSWORD RESET SYSTEM ---
app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.json({ success: false, message: "Identity not found." });
        const token = crypto.randomBytes(20).toString('hex');
        await db.query("UPDATE users SET reset_token = ? WHERE email = ?", [token, email]);

        // FIXED PATH FOR YOUR LOCAL SETUP
        const resetLink = `http://localhost:5500/frontend/reset.html?token=${token}`;
        console.log(`\n[SECURITY] Reset Link for ${email}:\n${resetLink}\n`);
        
        res.json({ success: true, message: "Token generated. Check server terminal for link." });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/api/update-password", async (req, res) => {
    const { token, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query("UPDATE users SET password = ?, reset_token = NULL WHERE reset_token = ?", [hashedPassword, token]);
        if (result.affectedRows === 0) return res.json({ success: false, message: "Token Expired." });
        res.json({ success: true, message: "Credentials Updated." });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => console.log(`🚀 VSTRA SERVER ACTIVE ON PORT ${PORT}`));