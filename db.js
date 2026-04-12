require('dotenv').config(); 
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'mysql-2459a884-vstra.b.aivencloud.com', // Aiven का होस्ट
    port: 12507,
    user: 'avnadmin',
    password: process.env.DB_PASSWORD, // पासवर्ड Render के Environment से आएगा
    database: 'ecommerce_db', // 👈 बस यही एक बदलाव हुआ है (defaultdb से ecommerce_db)
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;