import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";

console.log('Starting Gala Server...');

// Ensure uploads directory exists
const uploadsDir = path.resolve("public/uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create uploads directory (likely read-only environment):', err);
}

const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/gala.db' : 'gala.db';

// Copy existing db to tmp if in production and it exists in root
if (process.env.NODE_ENV === 'production' && fs.existsSync('gala.db') && !fs.existsSync(dbPath)) {
  try {
    fs.copyFileSync('gala.db', dbPath);
  } catch (err) {
    console.error('Failed to copy database to /tmp:', err);
  }
}

const db = new Database(dbPath);
console.log('Database connected at', dbPath);

// Initialize database
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  console.log('Tables initialized');
} catch (err) {
  console.error('Failed to initialize tables:', err);
}

// Seed initial content if empty or missing keys
const seedContent = [
  ['event_title', 'O Grande Baile de Gala'],
  ['event_date', 'Sábado, 12 de Dezembro de 2026'],
  ['event_location', 'Salão de Cristal, São Paulo'],
  ['event_description', 'Junte-se a nós para uma noite de elegância e celebração inigualáveis. Uma noite dedicada à excelência, com alta gastronomia, apresentações orquestrais ao vivo e um leilão silencioso.'],
  ['hero_image', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1920'],
  ['gallery_image_1', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800'],
  ['gallery_image_2', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=800'],
  ['theme_color', 'gold'],
  ['bg_color', '#0A0A0A'],
  ['text_color', '#FFFFF0'],
  ['card_bg_color', '#1A1A1A'],
  ['font_family', 'Cormorant Garamond'],
  ['logo_image', ''],
  ['thank_you_title', 'Obrigado pela Confirmação'],
  ['thank_you_text', 'Sua presença é muito importante para nós. Agradecemos por fazer parte deste momento especial.'],
  ['thank_you_image', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800'],
  ['invitation_text', 'Você está cordialmente convidado'],
  ['dress_code', 'Black Tie / Gala'],
  ['reception_time', '19:30 Horas'],
  ['rsvp_deadline', 'Por favor, confirme sua presença até 30 de Novembro'],
  ['hero_image_mobile', ''],
  ['schedule', '[]']
];

const insert = db.prepare("INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)");
seedContent.forEach(([key, value]) => insert.run(key, value));

// Force update existing English defaults to Portuguese if they haven't been changed
const updateDefaults = [
  ['event_title', 'The Grand Winter Gala', 'O Grande Baile de Gala'],
  ['event_date', 'Saturday, December 12th, 2026', 'Sábado, 12 de Dezembro de 2026'],
  ['event_location', 'The Crystal Ballroom, New York', 'Salão de Cristal, São Paulo'],
  ['event_description', 'Join us for an evening of unparalleled elegance and celebration. A night dedicated to excellence, featuring fine dining, live orchestral performances, and a silent auction.', 'Junte-se a nós para uma noite de elegância e celebração inigualáveis. Uma noite dedicada à excelência, com alta gastronomia, apresentações orquestrais ao vivo e um leilão silencioso.']
];

const updateStmt = db.prepare("UPDATE content SET value = ? WHERE key = ? AND value = ?");
updateDefaults.forEach(([key, oldVal, newVal]) => updateStmt.run(newVal, key, oldVal));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const app = express();

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// API Routes
app.get("/api/content", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM content").all() as { key: string, value: string }[];
    const content = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json(content);
  } catch (err) {
    console.error('Error in GET /api/content:', err);
    const fallback = seedContent.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    res.json(fallback);
  }
});

app.post("/api/content", (req, res) => {
  const { key, value } = req.body;
  db.prepare("INSERT OR REPLACE INTO content (key, value) VALUES (?, ?)").run(key, value);
  res.json({ success: true });
});

app.post("/api/upload", upload.single("image"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.get("/api/rsvps", (req, res) => {
  const rows = db.prepare("SELECT * FROM rsvps ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/api/rsvps", (req, res) => {
  const { name, sector } = req.body;
  if (!name || !sector) return res.status(400).json({ error: "Name and sector are required" });
  db.prepare("INSERT INTO rsvps (name, sector) VALUES (?, ?)").run(name, sector);
  res.json({ success: true });
});

// Static files for production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist")));
}

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default app;
