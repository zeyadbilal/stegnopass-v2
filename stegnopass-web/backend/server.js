const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { encryptVault, decryptVault } = require("./utils/crypto");
const { lsbEmbed, lsbExtract } = require("./utils/stego");

const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({ dest: path.join(__dirname, "uploads") });

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN || "http://localhost:5173");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/api/encode", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "fromVault", maxCount: 1 },
]), async (req, res) => {
  try {
    const { passphrase, passwords } = req.body;
    if (!req.files?.image?.[0]) return res.status(400).json({ error: "Cover image required" });
    if (!passphrase) return res.status(400).json({ error: "Passphrase required" });
    if (!passwords) return res.status(400).json({ error: "Passwords required" });

    const parsed = typeof passwords === "string" ? JSON.parse(passwords) : passwords;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res.status(400).json({ error: "At least one password entry required" });
    }

    let vault = {};
    if (req.files.fromVault?.[0]) {
      const raw = await lsbExtract(req.files.fromVault[0].path);
      vault = decryptVault(raw, passphrase);
    }

    for (const entry of parsed) {
      if (!entry.site || !entry.password) {
        return res.status(400).json({ error: "Each entry must have site and password" });
      }
      vault[entry.site.trim().toLowerCase()] = entry.password;
    }

    const payload = encryptVault(vault, passphrase);
    const outputPath = path.join(__dirname, "uploads", `vault_${Date.now()}.png`);
    await lsbEmbed(req.files.image[0].path, payload, outputPath);

    res.download(outputPath, "vault.png", () => {
      fs.unlink(outputPath, () => {});
      fs.unlink(req.files.image[0].path, () => {});
      if (req.files.fromVault?.[0]) fs.unlink(req.files.fromVault[0].path, () => {});
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/decode", upload.single("image"), async (req, res) => {
  try {
    const { passphrase, site } = req.body;
    if (!req.file) return res.status(400).json({ error: "Vault image required" });
    if (!passphrase) return res.status(400).json({ error: "Passphrase required" });

    const raw = await lsbExtract(req.file.path);
    const vault = decryptVault(raw, passphrase);

    fs.unlink(req.file.path, () => {});

    if (site) {
      const key = site.trim().toLowerCase();
      if (!(key in vault)) {
        return res.status(404).json({ error: `Site '${key}' not found`, available: Object.keys(vault) });
      }
      return res.json({ site: key, password: vault[key] });
    }

    res.json({ entries: vault, count: Object.keys(vault).length });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: err.message });
  }
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`StegnoPass API running on http://localhost:${PORT}`);
});
