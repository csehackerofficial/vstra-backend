const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// 🚨 रेंडर (Render) के लिए PORT को डायनामिक बनाना ज़रूरी है
const PORT = process.env.PORT || 5000;

// --- AUTH ROUTES ---
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // 1. पहले चेक करें कि क्या ईमेल पहले से मौजूद है
        const [existing] = await db.query("SELECT email FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "यह ईमेल पहले से रजिस्टर है! कृपया लॉगिन करें।" });
        }

        // 2. अगर ईमेल नया है, तो उसे सेव करें
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
        res.json({ success: true, message: "Registration Successful! Now you can Login." });
    } catch (err) { 
        console.error("Register Error:", err); // इससे Render के Logs में असली एरर दिखेगा
        res.status(500).json({ success: false, message: "Database Error: सर्वर में कुछ दिक्कत है।" }); 
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found. कृपया रजिस्टर करें।" });
        
        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (isMatch) {
            const role = (email === "kumaraayush7501@gmail.com") ? "admin" : "user";
            res.json({ success: true, user: { name: rows[0].name, email: rows[0].email, role } });
        } else { 
            res.status(401).json({ success: false, message: "Invalid Password." }); 
        }
    } catch (err) { 
        res.status(500).json({ success: false, message: "Login Server Error" }); 
    }
});

// --- INVENTORY ROUTES ---
app.get("/api/products", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Products load fail" });
    }
});

// --- PASSWORD RESET SYSTEM ---
app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length === 0) return res.json({ success: false, message: "Identity not found." });
        
        const token = crypto.randomBytes(20).toString('hex');
        await db.query("UPDATE users SET reset_token = ? WHERE email = ?", [token, email]);

        // 🚨 यहाँ LOCALHOST हटाकर NETLIFY का लिंक डाला है
        const resetLink = `https://vstra.netlify.app/reset.html?token=${token}`;
        console.log(`\n[SECURITY] Reset Link for ${email}:\n${resetLink}\n`);
        
        res.json({ success: true, message: "Token generated. Check Render Logs for the link." });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/api/update-password", async (req, res) => {
    const { token, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query("UPDATE users SET password = ?, reset_token = NULL WHERE reset_token = ?", [hashedPassword, token]);
        if (result.affectedRows === 0) return res.json({ success: false, message: "Token Expired." });
        res.json({ success: true, message: "Credentials Updated. You can login now." });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => console.log(`🚀 VSTRA SERVER ACTIVE ON PORT ${PORT}`));