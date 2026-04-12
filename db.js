/**
 * @file db.js
 * @description Production Database Connection for Aiven MySQL.
 */

// 1. सबसे ऊपर dotenv को कॉन्फ़िगर करें (स्थानीय टेस्टिंग के लिए ज़रूरी)
require('dotenv').config(); 

const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'mysql-2459a884-vstra.b.aivencloud.com',
    port: 12507,
    user: 'avnadmin',
    // 🚨 सुधार: यहाँ से सिंगल कोट्स (' ') हटा दिए गए हैं
    password: process.env.DB_PASSWORD, 
    database: 'defaultdb',
    ssl: {
        rejectUnauthorized: false // क्लाउड कनेक्शन (Aiven) के लिए अनिवार्य
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;