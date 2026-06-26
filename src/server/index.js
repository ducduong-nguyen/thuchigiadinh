const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();
const dbPath = process.env.DB_PATH || path.join(__dirname, 'family-budget.db');
const db = new Database(dbPath);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

app.use(cors());
app.use(express.json());

// ===== THÊM ROUTE CHO ĐƯỜNG DẪN GỐC =====
app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng đến với API quản lý thu chi gia đình!',
    endpoints: {
      categories: '/api/categories',
      transactions: '/api/transactions',
      auth: '/api/auth',
      users: '/api/users',
      stats: '/api/stats',
      export: '/api/export'
    },
    docs: 'https://github.com/ducduong-nguyen/thuchigiadinh'
  });
});
// ===== KẾT THÚC THÊM ROUTE =====

const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      categoryId INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(categoryId) REFERENCES categories(id)
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)');
    insertUser.run('Bố', 'father');
    insertUser.run('Mẹ', 'mother');
    insertUser.run('Chị', 'sister');
    insertUser.run('Cháu', 'child');
  }

  const accountCount = db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count;
  if (accountCount === 0) {
    const getUser = db.prepare('SELECT id FROM users WHERE name = ?');
    const insertAccount = db.prepare('INSERT INTO accounts (userId, username, passwordHash) VALUES (?, ?, ?)');
    const pw = bcrypt.hashSync('pass123', 10);
    const u1 = getUser.get('Bố'); if (u1) insertAccount.run(u1.id, 'bo', pw);
    const u2 = getUser.get('Mẹ'); if (u2) insertAccount.run(u2.id, 'me', pw);
    const u3 = getUser.get('Chị'); if (u3) insertAccount.run(u3.id, 'chi', pw);
    const u4 = getUser.get('Cháu'); if (u4) insertAccount.run(u4.id, 'chau', pw);
  }

  const adminAcc = db.prepare('SELECT * FROM accounts WHERE username = ?').get('admin');
  if (!adminAcc) {
    const insertUser = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)');
    const userRes = insertUser.run('Admin', 'admin');
    const adminId = userRes.lastInsertRowid;
    const pw = bcrypt.hashSync('admin', 10);
    const insertAccount = db.prepare('INSERT INTO accounts (userId, username, passwordHash) VALUES (?, ?, ?)');
    insertAccount.run(adminId, 'admin', pw);
  }

  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    insertCategory.run('Lương', 'income');
    insertCategory.run('Thưởng', 'income');
    insertCategory.run('Tiết kiệm', 'income');
    insertCategory.run('Ăn uống', 'expense');
    insertCategory.run('Đi lại', 'expense');
    insertCategory.run('Giải trí', 'expense');
    insertCategory.run('Học hành', 'expense');
  }
};

initDatabase();

// Auth helpers
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing authorization' });
  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid authorization' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, username, password, role } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const insertUser = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)');
  const userResult = insertUser.run(name, role || 'user');
  const userId = userResult.lastInsertRowid;
  const passwordHash = bcrypt.hashSync(password, 10);
  const insertAccount = db.prepare('INSERT INTO accounts (userId, username, passwordHash) VALUES (?, ?, ?)');
  const accountResult = insertAccount.run(userId, username, passwordHash);
  const accountId = accountResult.lastInsertRowid;
  const token = signToken({ userId, username, accountId, name });
  res.status(201).json({ token, user: { id: userId, name, role: role || 'user' } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const account = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
  if (!account) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, account.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(account.userId);
  const token = signToken({ userId: user.id, username: account.username, accountId: account.id, name: user.name });
  res.json({ token, user });
});

app.get('/api/users', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.userId);
  res.json([user]);
});

app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
});

app.get('/api/transactions', authMiddleware, (req, res) => {
  const transactions = db.prepare(`
    SELECT t.*, u.name AS userName, c.name AS categoryName
    FROM transactions t
    JOIN users u ON t.userId = u.id
    JOIN categories c ON t.categoryId = c.id
    WHERE t.userId = ?
    ORDER BY date DESC, createdAt DESC
  `).all(req.auth.userId);
  res.json(transactions);
});

app.post('/api/transactions', authMiddleware, (req, res) => {
  const { categoryId, amount, type, note, date } = req.body;
  const userId = req.auth.userId;
  const stmt = db.prepare(`
    INSERT INTO transactions (userId, categoryId, amount, type, note, date, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, categoryId, amount, type, note, date, new Date().toISOString());
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/transactions/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { categoryId, amount, type, note, date } = req.body;
  const tx = db.prepare('SELECT userId FROM transactions WHERE id = ?').get(id);
  if (!tx || tx.userId !== req.auth.userId) return res.status(404).json({ error: 'Not found' });
  const stmt = db.prepare(`
    UPDATE transactions
    SET categoryId = ?, amount = ?, type = ?, note = ?, date = ?
    WHERE id = ?
  `);
  stmt.run(categoryId, amount, type, note, date, id);
  res.sendStatus(204);
});

app.delete('/api/transactions/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const tx = db.prepare('SELECT userId FROM transactions WHERE id = ?').get(id);
  if (!tx || tx.userId !== req.auth.userId) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  res.sendStatus(204);
});

app.get('/api/stats', authMiddleware, (req, res) => {
  const userId = req.auth.userId;
  const totalIncome = db.prepare("SELECT IFNULL(SUM(amount), 0) AS total FROM transactions WHERE type = 'income' AND userId = ?").get(userId).total;
  const totalExpense = db.prepare("SELECT IFNULL(SUM(amount), 0) AS total FROM transactions WHERE type = 'expense' AND userId = ?").get(userId).total;
  const byCategory = db.prepare(`
    SELECT c.id, c.name, c.type, IFNULL(SUM(t.amount), 0) AS total
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.categoryId AND t.userId = ?
    GROUP BY c.id
  `).all(userId);
  res.json({ totalIncome, totalExpense, byCategory });
});

app.get('/api/export/excel', authMiddleware, async (req, res) => {
  const userId = req.auth.userId;
  const rows = db.prepare(`
    SELECT t.date, t.type, c.name AS category, t.amount, t.note
    FROM transactions t
    JOIN categories c ON t.categoryId = c.id
    WHERE t.userId = ?
    ORDER BY date DESC
  `).all(userId);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Note', key: 'note', width: 30 }
  ];
  rows.forEach(r => sheet.addRow(r));
  const buf = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(Buffer.from(buf));
});

app.get('/api/export/pdf', authMiddleware, (req, res) => {
  const userId = req.auth.userId;
  const rows = db.prepare(`
    SELECT t.date, t.type, c.name AS category, t.amount, t.note
    FROM transactions t
    JOIN categories c ON t.categoryId = c.id
    WHERE t.userId = ?
    ORDER BY date DESC
  `).all(userId);
  const doc = new PDFDocument({ margin: 30 });
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);
  doc.fontSize(18).text(`Transactions - ${req.auth.name}`, { align: 'center' });
  doc.moveDown();
  rows.forEach(r => {
    doc.fontSize(10).text(`${r.date} | ${r.type} | ${r.category} | ${r.amount} | ${r.note || ''}`);
    doc.moveDown(0.2);
  });
  doc.end();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));