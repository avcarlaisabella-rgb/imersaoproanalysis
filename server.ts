import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
let supabase: any = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.error("Failed to initialize Supabase client:", e);
}

const app = express();
app.use(express.json());

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

const getFallbackContent = () => {
  return seedContent.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

const upload = multer({ storage: multer.memoryStorage() });

// API Routes
app.get("/api/health", (req, res) => res.json({ status: "ok", supabase: !!supabase }));

app.post("/api/upload", upload.single("image"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  try {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      if (error.message.includes('row-level security')) {
        throw new Error("Erro de Permissão (RLS). A maneira mais fácil de resolver é: No Supabase, vá em 'SQL Editor', clique em 'New Query' e cole este código: \n\n CREATE POLICY \"Permitir Tudo\" ON storage.objects FOR ALL USING (bucket_id = 'images'); \n\n Depois clique em 'Run'.");
      }
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: `Erro no upload: ${err.message}. Certifique-se de que você criou um bucket chamado exatamente 'images' (tudo minúsculo) no seu Supabase e que ele está marcado como 'Public'.` });
  }
});

app.get("/api/debug", (req, res) => {
  res.json({
    env: process.env.NODE_ENV,
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_ANON_KEY,
    supabaseInit: !!supabase
  });
});

app.get("/api/content", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('content').select('*');
      if (!error && data && data.length > 0) {
        const content = data.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});
        return res.json(content);
      }
    }
    res.json(getFallbackContent());
  } catch (err) {
    res.json(getFallbackContent());
  }
});

app.post("/api/content", async (req, res) => {
  const { key, value } = req.body;
  try {
    if (supabase) {
      await supabase.from('content').upsert({ key, value });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update content" });
  }
});

app.get("/api/rsvps", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('rsvps').select('*').order('created_at', { ascending: false });
      if (!error) return res.json(data || []);
    }
    res.json([]);
  } catch (err) {
    res.json([]);
  }
});

app.post("/api/rsvps", async (req, res) => {
  const { name, sector } = req.body;
  try {
    if (supabase) {
      await supabase.from('rsvps').insert({ name, sector });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save RSVP" });
  }
});

app.post("/api/rsvps/clear", async (req, res) => {
  try {
    if (supabase) {
      // Delete all rows from rsvps table
      const { error } = await supabase.from('rsvps').delete().neq('id', 0);
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Clear RSVPs error:', err);
    res.status(500).json({ error: "Failed to clear RSVPs" });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  
  app.listen(3000, "0.0.0.0", () => {
    console.log("Dev server running on http://localhost:3000");
  });
}

export default app;
