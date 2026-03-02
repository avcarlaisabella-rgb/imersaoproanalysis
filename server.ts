import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

console.log('Starting Gala Server with Supabase Support...');

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
  console.warn('SUPABASE_URL or SUPABASE_ANON_KEY not found. Running in local-only mode (data will not persist on Vercel).');
}

// Ensure uploads directory exists
const uploadsDir = path.resolve("public/uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create uploads directory (likely read-only environment):', err);
}

// Seed initial content
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
app.get("/api/content", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('content').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        const content = data.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        return res.json(content);
      }
    }
    // Fallback to seed content if no data or no supabase
    const fallback = seedContent.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    res.json(fallback);
  } catch (err) {
    console.error('Error in GET /api/content:', err);
    const fallback = seedContent.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    res.json(fallback);
  }
});

app.post("/api/content", async (req, res) => {
  const { key, value } = req.body;
  try {
    if (supabase) {
      const { error } = await supabase.from('content').upsert({ key, value });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/content:', err);
    res.status(500).json({ error: "Failed to update content" });
  }
});

app.post("/api/upload", upload.single("image"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.get("/api/rsvps", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('rsvps').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data || []);
    }
    res.json([]);
  } catch (err) {
    console.error('Error in GET /api/rsvps:', err);
    res.json([]);
  }
});

app.post("/api/rsvps", async (req, res) => {
  const { name, sector } = req.body;
  if (!name || !sector) return res.status(400).json({ error: "Name and sector are required" });
  
  try {
    if (supabase) {
      const { error } = await supabase.from('rsvps').insert({ name, sector });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error in POST /api/rsvps:', err);
    res.status(500).json({ error: "Failed to save RSVP" });
  }
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
