const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db"); // आपका डेटाबेस कनेक्शन

const app = express();
app.use(cors());
app.use(express.json()); // JSON डेटा पढ़ने के लिए

const PORT = process.env.PORT || 5000;

// --- AUTH ROUTES ---
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    try {
        const [existing] = await db.query("SELECT email FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "यह ईमेल पहले से रजिस्टर है! कृपया लॉगिन करें।" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
        res.json({ success: true, message: "Registration Successful! Now you can Login." });
    } catch (err) { 
        console.error("Register Error:", err);
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

// 1. प्रोडक्ट दिखाने के लिए (GET)
app.get("/api/products", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("Products Load Error:", err);
        res.status(500).json({ message: "Products load fail" });
    }
});

// 2. नया प्रोडक्ट ऐड करने के लिए (POST) 👈 यह नया कोड है!
app.post("/api/add-product", async (req, res) => {
    // फ्रंटएंड से डेटा निकालना (चाहे नाम कुछ भी हो, ये स्मार्टली कैच कर लेगा)
    const name = req.body.name;
    const image_url = req.body.image_url || req.body.imageLink;
    const purchase_link = req.body.purchase_link || req.body.purchaseLink;
    const mrp = req.body.mrp || req.body.originalPrice;
    const price = req.body.price || req.body.salePrice;
    const category = req.body.category;
    const description = req.body.description || "VSTRA Exclusive Product"; // डिफ़ॉल्ट डिस्क्रिप्शन
    const stock = req.body.stock || 10; // डिफ़ॉल्ट स्टॉक

    if (!name || !price) {
        return res.status(400).json({ success: false, message: "Product Name and Price are required!" });
    }

    try {
        await db.query(
            "INSERT INTO products (name, description, price, mrp, category, stock, image_url, purchase_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, description, price, mrp, category, stock, image_url, purchase_link]
        );
        res.json({ success: true, message: "Product Successfully Added to VSTRA Catalog!" });
    } catch (err) {
        console.error("Add Product Error:", err);
        res.status(500).json({ success: false, message: "Failed to add product to database." });
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