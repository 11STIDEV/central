import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function registerAtestadosRoutes(app) {
  app.get("/api/dp-financeiro/atestados", async (req, res) => {
    const spreadsheetId = (req.query.spreadsheetId || "1m60KFmuYQfZJTHC2MLOn1Y1oFzET_gBN8MOjWOwBG2s").toString();
    const keyFilePath = path.join(__dirname, "service-account-key.json");

    if (!fs.existsSync(keyFilePath)) {
      return res.json({
        success: false,
        source: "google_sheets_error",
        message: "Chave do Google Service Account (service-account-key.json) não encontrada no servidor.",
      });
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });
      const sheets = google.sheets({ version: "v4", auth });

      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetsList = meta.data.sheets || [];
      
      // Tenta encontrar a aba com gid correspondente ou primeira aba
      const selectedSheet = sheetsList.find(s => s.properties?.sheetId?.toString() === "1388405945") 
        || sheetsList[0];
      const sheetTitle = selectedSheet?.properties?.title || "Folha1";

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetTitle}'!A1:Z1000`,
      });

      const rows = response.data.values || [];
      return res.json({
        success: true,
        source: "google_sheets",
        spreadsheetTitle: meta.data.properties?.title,
        sheetTitle,
        rows,
      });
    } catch (err) {
      console.warn("[atestadosRoutes] Erro ao sincronizar Google Sheets API:", err.message);

      // Fallback: tentar download direto em CSV caso a planilha seja pública ou exportável
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
        console.warn("[atestadosRoutes] Fallback CSV público também falhou:", csvErr.message);
      }

      return res.json({
        success: false,
        source: "google_sheets_error",
        message: err.message,
        serviceAccountEmail: "central-connect-ou@vinculandoou.iam.gserviceaccount.com",
        helpText:
          "Verifique se a planilha está compartilhada com o e-mail da Service Account (central-connect-ou@vinculandoou.iam.gserviceaccount.com) e se a Google Sheets API está ativada no console do Google Cloud.",
      });
    }
  });
}
