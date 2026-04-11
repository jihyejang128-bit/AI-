import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to proxy Google Sheets request
  app.post("/api/sheets", async (req, res) => {
    const { scriptUrl, data } = req.body;
    
    if (!scriptUrl) {
      return res.status(400).json({ error: "Google Apps Script URL is required" });
    }

    try {
      // We use a simple fetch to the Apps Script URL
      // Note: Apps Script Web Apps usually require a POST or GET
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Apps Script often redirects, but fetch handles it.
      // However, Apps Script might return a 200 even if it fails internally.
      const result = await response.text();
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error proxying to Google Sheets:", error);
      res.status(500).json({ error: "Failed to send data to Google Sheets" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
