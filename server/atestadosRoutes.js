import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheFilePath = path.join(__dirname, "data", "atestados-cache.json");

function lerCacheLocal() {
  try {
    if (fs.existsSync(cacheFilePath)) {
      const content = fs.readFileSync(cacheFilePath, "utf8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn("[atestadosRoutes] Erro ao ler cache local:", e.message);
  }
  return null;
}

function salvarCacheLocal(data) {
  try {
    const dataDir = path.dirname(cacheFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("[atestadosRoutes] Erro ao salvar cache local:", e.message);
    return false;
  }
}

export function registerAtestadosRoutes(app) {
  // GET: Obter atestados (Cache local > Google Sheets API > CSV Público)
  app.get("/api/dp-financeiro/atestados", async (req, res) => {
    const spreadsheetId = (req.query.spreadsheetId || "1m60KFmuYQfZJTHC2MLOn1Y1oFzET_gBN8MOjWOwBG2s").toString();
    const keyFilePath = path.join(__dirname, "service-account-key.json");

    // 1. Tentar ler do cache salvo por upload anterior
    const cache = lerCacheLocal();
    if (cache && Array.isArray(cache.rows) && cache.rows.length > 0) {
      return res.json({
        success: true,
        source: "cache_local",
        spreadsheetTitle: cache.title || "Planilha Importada (Cache Salvo)",
        rows: cache.rows,
        headers: cache.headers || [],
        updatedAt: cache.updatedAt,
      });
    }

    // 2. Tentar via Google Sheets API
    if (fs.existsSync(keyFilePath)) {
      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        const sheets = google.sheets({ version: "v4", auth });

        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetsList = meta.data.sheets || [];
        const selectedSheet = sheetsList.find(s => s.properties?.sheetId?.toString() === "1388405945") || sheetsList[0];
        const sheetTitle = selectedSheet?.properties?.title || "Folha1";

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${sheetTitle}'!A1:Z1000`,
        });

        const rows = response.data.values || [];
        if (rows.length > 0) {
          return res.json({
            success: true,
            source: "google_sheets",
            spreadsheetTitle: meta.data.properties?.title,
            sheetTitle,
            rows,
          });
        }
      } catch (err) {
        console.warn("[atestadosRoutes] Erro Google Sheets API:", err.message);
      }
    }

    // 3. Fallback: CSV Público
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=1388405945`;
      const fetchRes = await fetch(csvUrl);
      if (fetchRes.ok) {
        const csvText = await fetchRes.text();
        const rows = csvText
          .split(/\r?\n/)
          .map((line) => line.split(/;|,|\t/).map((c) => c.replace(/^["']|["']$/g, "").trim()));
        if (rows.length > 1) {
          return res.json({
            success: true,
            source: "google_sheets_csv",
            spreadsheetTitle: "Planilha Atestados (CSV Público)",
            rows,
          });
        }
      }
    } catch (csvErr) {
      console.warn("[atestadosRoutes] Erro Fallback CSV:", csvErr.message);
    }

    return res.json({
      success: false,
      source: "google_sheets_error",
      message: "Planilha não sincronizada no Google Sheets API. Compartilhe com central-connect-ou@vinculandoou.iam.gserviceaccount.com ou faça a importação do arquivo CSV.",
    });
  });

  // POST: Salvar dados do arquivo CSV enviado pelo usuário para persistência
  app.post("/api/dp-financeiro/atestados", (req, res) => {
    const { rows, headers, title } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "Dados de linhas inválidos" });
    }

    const payload = {
      title: title || "Planilha Importada",
      headers: headers || [],
      rows,
      updatedAt: new Date().toISOString(),
    };

    const ok = salvarCacheLocal(payload);
    if (ok) {
      return res.json({ success: true, message: "Dados salvos e persistidos com sucesso no servidor!" });
    } else {
      return res.status(500).json({ success: false, message: "Falha ao gravar arquivo de cache no servidor" });
    }
  });

  // DELETE: Limpar cache persistido
  app.delete("/api/dp-financeiro/atestados", (req, res) => {
    try {
      if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
      }
      return res.json({ success: true, message: "Cache de atestados limpo com sucesso!" });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });
}
