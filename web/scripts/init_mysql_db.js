const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf-8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim();
    }
});

async function main() {
    const connection = await mysql.createConnection({
        host: env.DB_HOST,
        port: parseInt(env.DB_PORT || '3306'),
        user: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
    });

    console.log('Connected to MySQL database:', env.DB_DATABASE);

    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            passwordHash VARCHAR(255) NOT NULL,
            avatarUrl VARCHAR(255),
            calorieGoal INT DEFAULT 2000,
            proteinGoal INT DEFAULT 150,
            carbsGoal INT DEFAULT 200,
            fatGoal INT DEFAULT 70,
            gender VARCHAR(50),
            ageYears INT,
            heightCm FLOAT,
            weightKg FLOAT,
            onboarded BOOLEAN DEFAULT FALSE,
            createdAt BIGINT NOT NULL,
            plan VARCHAR(50) DEFAULT 'free',
            planActivatedAt BIGINT,
            planExpiresAt BIGINT,
            INDEX idx_email (email)
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expiresAt BIGINT NOT NULL,
            createdAt BIGINT NOT NULL,
            INDEX idx_token (token),
            INDEX idx_user (userId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS meals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            mealType VARCHAR(100) NOT NULL,
            calories FLOAT NOT NULL,
            proteinG FLOAT NOT NULL,
            carbsG FLOAT NOT NULL,
            fatG FLOAT NOT NULL,
            servingSize VARCHAR(100),
            date VARCHAR(20) NOT NULL,
            loggedAt BIGINT NOT NULL,
            aiGenerated BOOLEAN DEFAULT FALSE,
            INDEX idx_user_date (userId, date),
            INDEX idx_user (userId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            date VARCHAR(20) NOT NULL,
            weightKg FLOAT,
            caloriesConsumed FLOAT NOT NULL DEFAULT 0,
            proteinConsumed FLOAT NOT NULL DEFAULT 0,
            carbsConsumed FLOAT NOT NULL DEFAULT 0,
            fatConsumed FLOAT NOT NULL DEFAULT 0,
            waterMl INT DEFAULT 0,
            steps INT DEFAULT 0,
            recordedAt BIGINT NOT NULL,
            INDEX idx_user_date (userId, date),
            INDEX idx_user (userId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS foods (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            cals FLOAT NOT NULL,
            protein FLOAT NOT NULL,
            carbs FLOAT NOT NULL,
            fat FLOAT NOT NULL,
            emoji VARCHAR(50),
            cat VARCHAR(100),
            FULLTEXT idx_name (name)
        )`,
        `CREATE TABLE IF NOT EXISTS bodyPhotos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            date VARCHAR(20) NOT NULL,
            imageData LONGTEXT,
            analysis TEXT,
            weekLabel VARCHAR(100),
            notes TEXT,
            recordedAt BIGINT NOT NULL,
            INDEX idx_user_date (userId, date),
            INDEX idx_user (userId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS mealPlans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            createdDate VARCHAR(20) NOT NULL,
            planJson LONGTEXT NOT NULL,
            planName VARCHAR(255) NOT NULL,
            calorieTarget INT NOT NULL,
            isPinned BOOLEAN DEFAULT FALSE,
            createdAt BIGINT NOT NULL,
            INDEX idx_user_date (userId, createdDate),
            INDEX idx_user (userId),
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`
    ];

    for (const sql of tables) {
        const matches = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (!matches) continue;
        const tableName = matches[1];
        try {
            await connection.query(sql);
            console.log(`Table ${tableName} created or already exists.`);
        } catch (err) {
            console.error(`Error creating table ${tableName}:`, err);
        }
    }

    console.log('Database initialization complete.');
    await connection.end();
}

main().catch(console.error);
