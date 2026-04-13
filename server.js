const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db"); // आपका डेटाबेस कनेक्शन

const app = express();
app.use(cors());
app.use(express.json()); // JSON डेटा पढ़ने के लिए

const PORT = process.env.PORT || 5000;

// ==========================================
// 🌟 --- AUTH ROUTES (Email & Phone) --- 🌟
// ==========================================

app.post("/api/register", async (req, res) => {
    // 🌟 FIX: Added phone_number
    const { name, email, password, phone_number } = req.body;

    if (!name || !email || !password || !phone_number) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    try {
        // 🌟 FIX: Check both Email and Phone
        const [existing] = await db.query("SELECT email FROM users WHERE email = ? OR phone_number = ?", [email, phone_number]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: "Email or Phone is already registered! Please Login." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 🌟 FIX: First users are admin, rest are normal users
        const role = (email === "kumaraayush7501@gmail.com" || email === "rishujha676@gmail.com") ? "admin" : "user";

        await db.query(
            "INSERT INTO users (name, email, password, phone_number, role) VALUES (?, ?, ?, ?, ?)", 
            [name, email, hashedPassword, phone_number, role]
        );
        res.json({ success: true, message: "Registration Successful! Now you can Login." });
    } catch (err) { 
        console.error("Register Error:", err);
        res.status(500).json({ success: false, message: "Database Error: Server Issue." }); 
    }
});

app.post("/api/login", async (req, res) => {
    // 🌟 FIX: login_id can be Email OR Phone
    const { login_id, password } = req.body; 
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = ? OR phone_number = ?", [login_id, login_id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found. Please register." });
        
        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (isMatch) {
            // 🌟 FIX: Sending role and phone_number back to frontend
            res.json({ 
                success: true, 
                user: { id: rows[0].id, name: rows[0].name, email: rows[0].email, phone: rows[0].phone_number, role: rows[0].role } 
            });
        } else { 
            res.status(401).json({ success: false, message: "Invalid Password." }); 
        }
    } catch (err) { 
        res.status(500).json({ success: false, message: "Login Server Error" }); 
    }
});

// ==========================================
// 🌟 --- ADMIN USER MANAGEMENT ROUTES --- 🌟
// ==========================================

// एडमिन पैनल पर सारे यूज़र्स दिखाने के लिए (GET)
app.get("/api/users", async (req, res) => {
    try {
        // 🌟 FIX: Added phone_number & role
        const [rows] = await db.query("SELECT id, name, email, phone_number, role, created_at FROM users ORDER BY id DESC");
        res.json(rows);
    } catch (err) {
        console.error("Users Load Error:", err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// 🌟 NEW: किसी भी यूज़र को एडमिन बनाने या हटाने के लिए (PUT)
app.put("/api/users/:id/role", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; 
    try {
        await db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
        res.json({ success: true, message: `User role updated to ${role}` });
    } catch (err) { 
        res.status(500).json({ success: false, message: "Failed to update role." }); 
    }
});

// ==========================================
// 🌟 --- INVENTORY ROUTES --- 🌟
// ==========================================

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
        res.json({ success: true, message: "Product Successfully Added to VASTRA Catalog!" });
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

app.get("/api/banners", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM banners ORDER BY id DESC");
        res.json(rows);
    } catch (err) { res.status(500).json({ message: "Banners load fail" }); }
});

app.post("/api/banners", async (req, res) => {
    const { image_url, target_link } = req.body;
    if (!image_url || !target_link) return res.status(400).json({ success: false, message: "Image and Link required!" });
    try {
        await db.query("INSERT INTO banners (image_url, target_link) VALUES (?, ?)", [image_url, target_link]);
        res.json({ success: true, message: "Banner Active!" });
    } catch (err) { res.status(500).json({ success: false, message: "Failed to add banner." }); }
});

app.delete("/api/banners/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM banners WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Banner Deleted." });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 🌟 --- WISHLIST & ORDERS ROUTES --- 🌟
// ==========================================

app.post("/api/wishlist", async (req, res) => {
    const { email, product_id } = req.body;
    try {
        const [existing] = await db.query("SELECT * FROM wishlist WHERE user_email = ? AND product_id = ?", [email, product_id]);
        if (existing.length > 0) return res.json({ success: false, message: "Already in wishlist" });
        
        await db.query("INSERT INTO wishlist (user_email, product_id) VALUES (?, ?)", [email, product_id]);
        res.json({ success: true, message: "Added to Wishlist" });
    } catch (err) { res.status(500).json({ success: false }); }
});

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

app.delete("/api/wishlist/:id", async (req, res) => {
    try {
        await db.query("DELETE FROM wishlist WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post("/api/orders", async (req, res) => {
    const { email, product_id } = req.body;
    try {
        await db.query("INSERT INTO orders (user_email, product_id) VALUES (?, ?)", [email, product_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

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

// 🌟 NEW: Admin Sales (Buy Now clicks tracking)
app.get("/api/admin/sales", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT o.id AS order_id, o.order_date, p.name AS product_name, p.image_url AS product_image, p.price, u.name AS customer_name, u.email AS customer_email 
            FROM orders o 
            JOIN products p ON o.product_id = p.id 
            JOIN users u ON o.user_email = u.email 
            ORDER BY o.order_date DESC;
        `);
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ success: false, message: "Sales load failed" }); 
    }
});

// ==========================================
// 🌟 --- PASSWORD RESET SYSTEM --- 🌟
// ==========================================

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