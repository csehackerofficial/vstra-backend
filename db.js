/**
 * @file db.js
 * @description Production Database Connection for Aiven MySQL.
 */

const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'mysql-2459a884-vstra.b.aivencloud.com',
    port: 12507,
    user: 'avnadmin',
    password: 'AVNS_c7vt3TB4laCKHxxTgdl', // वहां से कॉपी करें
    database: 'defaultdb',
    ssl: {
        rejectUnauthorized: false // 🚨 क्लाउड कनेक्शन के लिए यह अनिवार्य है
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;