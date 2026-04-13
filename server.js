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
            // 🌟 एडमिन लिस्ट
            const adminEmails = ["kumaraayush7501@gmail.com", "rishujha676@gmail.com"];
            const role = adminEmails.includes(email) ? "admin" : "user";
            
            res.json({ success: true, user: { name: rows[0].name, email: rows[0].email, role } });
        } else { 
            res.status(401).json({ success: false, message: "Invalid Password." }); 
        }
    } catch (err) { 
        res.status(500).json({ success: false, message: "Login Server Error" }); 
    }
});

// ==========================================
// 🌟 --- USER MANAGEMENT ROUTES --- 🌟
// ==========================================

// एडमिन पैनल पर सारे यूज़र्स दिखाने के लिए (GET)
app.get("/api/users", async (req, res) => {
    try {
        // पासवर्ड को छोड़कर बाकी सारी डिटेल्स भेज रहे हैं
        const [rows] = await db.query("SELECT id, name, email, created_at FROM users ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("Users Load Error:", err);
        res.status(500).json({ message: "Failed to fetch users" });
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

// 2. नया प्रोडक्ट ऐड करने के लिए (POST)
app.post("/api/add-product", async (req, res) => {
    const { name, category, description, stock } = req.body;
    const image_url = req.body.image_url || req.body.imageLink;
    const purchase_link = req.body.purchase_link || req.body.purchaseLink;
    const mrp = req.body.mrp || req.body.originalPrice;
    const price = req.body.price || req.body.salePrice;

    if (!name || !price) {
        return res.status(400).json({ success: false, message: "Product Name and Price are required!" });
    }

    try {
        await db.query(
            "INSERT INTO products (name, description, price, mrp, category, stock, image_url, purchase_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, description || "VSTRA Exclusive", price, mrp, category, stock || 10, image_url, purchase_link]
        );
        res.json({ success: true, message: "Product Successfully Added to VSTRA Catalog!" });
    } catch (err) {
        console.error("Add Product Error:", err);
        res.status(500).json({ success: false, message: "Failed to add product to database." });
    }
});

// 3. प्रोडक्ट अपडेट/एडिट करने के लिए (PUT) 
app.put("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const { name, category, description, stock } = req.body;
    const image_url = req.body.image_url || req.body.imageLink;
    const purchase_link = req.body.purchase_link || req.body.purchaseLink;
    const mrp = req.body.mrp || req.body.originalPrice;
    const price = req.body.price || req.body.salePrice;

    if (!name || !price) {
        return res.status(400).json({ success: false, message: "Product Name and Price are required!" });
    }

    try {
        await db.query(
            "UPDATE products SET name = ?, description = ?, price = ?, mrp = ?, category = ?, stock = ?, image_url = ?, purchase_link = ? WHERE id = ?",
            [name, description || "VSTRA Exclusive", price, mrp, category, stock || 10, image_url, purchase_link, id]
        );
        res.json({ success: true, message: "Product Successfully Updated!" });
    } catch (err) {
        console.error("Update Product Error:", err);
        res.status(500).json({ success: false, message: "Failed to update product." });
    }
});

// 4. प्रोडक्ट डिलीट करने के लिए (DELETE)
app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM products WHERE id = ?", [id]);
        res.json({ success: true, message: "Product deleted successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Delete operation failed." });
    }
});

// ==========================================
// 🌟 --- BANNER MANAGEMENT ROUTES --- 🌟
// ==========================================

// 1. सारे बैनर दिखाने के लिए (GET)
app.get("/api/banners", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM banners ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Banners load fail" });
    }
});

// 2. नया बैनर ऐड करने के लिए (POST)
app.post("/api/banners", async (req, res) => {
    const { image_url, target_link } = req.body;
    if (!image_url || !target_link) {
        return res.status(400).json({ success: false, message: "Image and Link required!" });
    }
    try {
        await db.query("INSERT INTO banners (image_url, target_link) VALUES (?, ?)", [image_url, target_link]);
        res.json({ success: true, message: "Banner Active!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to add banner." });
    }
});

// 3. बैनर डिलीट करने के लिए (DELETE)
app.delete("/api/banners/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM banners WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Banner Deleted." });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// 🌟 --- WISHLIST & ORDERS ROUTES --- 🌟
// ==========================================

// 1. Wishlist में ऐड करना (POST)
app.post("/api/wishlist", async (req, res) => {
    const { email, product_id } = req.body;
    try {
        const [existing] = await db.query("SELECT * FROM wishlist WHERE user_email = ? AND product_id = ?", [email, product_id]);
        if (existing.length > 0) return res.json({ success: false, message: "Already in wishlist" });
        
        await db.query("INSERT INTO wishlist (user_email, product_id) VALUES (?, ?)", [email, product_id]);
        res.json({ success: true, message: "Added to Wishlist" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 2. यूज़र की Wishlist मंगाना (GET)
app.get("/api/wishlist/:email", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT w.id as wishlist_id, p.* FROM wishlist w 
            JOIN products p ON w.product_id = p.id 
            WHERE w.user_email = ? ORDER BY w.id DESC
        `, [req.params.email]);
        res.json(rows);
    } catch (err) { res.status(500).json({ success: false }); }
});

// 3. Wishlist से डिलीट करना (DELETE)
app.delete("/api/wishlist/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM wishlist WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 4. Order (Buy Now Click) सेव करना (POST)
app.post("/api/orders", async (req, res) => {
    const { email, product_id } = req.body;
    try {
        await db.query("INSERT INTO orders (user_email, product_id) VALUES (?, ?)", [email, product_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 5. यूज़र के Orders मंगाना (GET)
app.get("/api/orders/:email", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT o.id as order_id, o.order_date, p.* FROM orders o 
            JOIN products p ON o.product_id = p.id 
            WHERE o.user_email = ? ORDER BY o.id DESC
        `, [req.params.email]);
        res.json(rows);
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================

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

app.listen(PORT, () => console.log(`🚀 VASTRA SERVER ACTIVE ON PORT ${PORT}`));