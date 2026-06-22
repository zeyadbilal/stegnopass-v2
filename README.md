# 🔐 StegnoPass v2 — Hide Your Passwords Inside Images

> **A steganographic password manager that conceals an AES-256-GCM encrypted vault inside an ordinary PNG image.**

---

## 📖 What Is StegnoPass?

StegnoPass v2 is a **multi-platform password manager** that combines two powerful cryptographic techniques — **steganography** and **authenticated encryption** — to store your passwords in a way that is both **invisible** and **unbreakable** without the master passphrase.

Instead of saving passwords in a traditional database or encrypted file (which screams "secrets are here!"), StegnoPass hides your entire password vault **inside the pixels of a normal-looking PNG image**. The image looks completely ordinary — you can post it on social media, store it on a USB drive, send it in a chat — and nobody would ever know it contains your passwords.

The project ships as **three integrated components**:

| Component | Description |
|---|---|
| **Python CLI** | Command-line tool for encoding/decoding vault images |
| **Web App** | Express.js backend + React/Vite frontend for browser-based access |
| **Chrome Extension** | Drag-and-drop auto-fill directly on any login page |

All three components share an **identical binary payload format**, meaning a vault image created by the CLI can be decoded by the extension — and vice versa.

---

## 🧩 What Problem Does It Solve?

### The Problem with Traditional Password Managers

Traditional password managers store your credentials in **encrypted databases** or **cloud vaults**. While the encryption itself may be strong, these solutions have fundamental weaknesses:

1. **Visible targets** — An encrypted `.kdbx` file or a cloud vault account is an obvious target. Attackers know exactly what it is and what it contains.
2. **Centralized attack surface** — Cloud-synced managers (LastPass, 1Password, Bitwarden) create a single point of failure. If the service is breached, millions of vaults are exposed at once.
3. **Metadata leakage** — Even without cracking the encryption, an attacker knows you *have* a password vault and can focus their efforts on it.
4. **Dependency on third-party infrastructure** — Cloud managers require trust in a company's security practices, server availability, and business continuity.

### How StegnoPass Solves It

StegnoPass eliminates these problems by applying the principle of **security through obscurity as an additional layer** (not a replacement) on top of strong encryption:

| Problem | StegnoPass Solution |
|---|---|
| Encrypted files are obvious targets | The vault is hidden inside a normal PNG — **nobody knows it exists** |
| Cloud sync = centralized risk | **Zero network traffic** — everything runs locally on your machine |
| Metadata exposure | The image reveals nothing — it's just a photo |
| Third-party dependency | **Self-contained** — no accounts, no servers, no subscriptions |

The core insight is simple but powerful: **you can't attack what you can't find.**

---

## 🛡️ Why Is This Important?

### 1. Defense in Depth
StegnoPass implements **two independent layers** of protection:
- **Layer 1 — Steganography (Covertness):** The vault is invisible. LSB (Least Significant Bit) embedding modifies pixel values by at most ±1 out of 255 — completely imperceptible to the human eye.
- **Layer 2 — AES-256-GCM (Confidentiality + Integrity):** Even if someone discovers the hidden data, it's encrypted with military-grade authenticated encryption. The GCM tag ensures any tampering is detected.

### 2. Zero-Trust Architecture
- The Chrome extension performs **all decryption locally** using the Web Crypto API.
- No passwords, images, or passphrases are ever sent to any remote server.
- The extension requires only `activeTab` and `scripting` permissions — minimal attack surface.

### 3. Portability and Deniability
- Your vault is just a PNG image — store it anywhere: USB drive, cloud storage, email attachment, even a social media post.
- There is **no metadata, no file extension, no header** that reveals it's a password vault.
- Plausible deniability: "It's just a photo."

### 4. Industry-Standard Cryptography
- **AES-256-GCM** — Authenticated encryption (tamper-proof)
- **PBKDF2-SHA1, 100,000 iterations** — Key derivation that meets OWASP 2023 minimum recommendations
- **Random 16-byte salt per vault** — Prevents rainbow table attacks; two vaults with the same passphrase produce entirely different payloads
- **Magic bytes `SPVT`** — Fast format validation before expensive key derivation

---

## 💡 Why This Is a Creative & Innovative Idea

### Beyond Traditional Security Thinking

Most password managers compete on the same axis: *stronger encryption, better UI, more cloud features*. StegnoPass takes a fundamentally different approach by asking: **"What if the vault itself was invisible?"**

This is a paradigm shift:

| Traditional Approach | StegnoPass Approach |
|---|---|
| Protect the vault with a strong lock | **Hide the vault so nobody knows it exists** |
| Assume attackers will find the file | **Make the file indistinguishable from a normal image** |
| Rely solely on encryption strength | **Combine encryption with steganographic concealment** |
| Require specialized software to access | **Drag-and-drop onto any password field** |

### Real-World Scenarios Where This Shines

- **Journalists & activists** in hostile environments can carry passwords across borders as innocent-looking photos.
- **Travelers** can store sensitive credentials in images on their phone without raising suspicion at checkpoints.
- **Corporate environments** where storing password files might violate policy — an image raises no flags.
- **Personal backup** — your vault survives as long as the image does, with no vendor lock-in.

### Technical Creativity

- **Cross-platform binary compatibility** — The same vault image works across Python, Node.js, and the browser's Web Crypto API, despite each using different crypto libraries.
- **React/Vue-compatible auto-fill** — The extension uses the native `HTMLInputElement.prototype.value` setter with synthetic events to work with modern SPA frameworks.
- **Auto site-detection** — The extension reads `window.location.hostname` and automatically fills the correct password from a multi-site vault.

---

## 🏗️ Project Structure

```
stegnopass-v2/
├── cli/                          Python CLI tool
│   ├── stegnopass.py             Main CLI — encode, decode, list commands
│   └── requirements.txt          Python dependencies
├── stegnopass-web/               Web application
│   ├── backend/                  Express.js API (port 3001)
│   │   ├── server.js             REST API — /api/encode, /api/decode
│   │   └── utils/
│   │       ├── crypto.js         AES-256-GCM encrypt/decrypt
│   │       └── stego.js          LSB steganography (Jimp)
│   └── frontend/                 React + Vite (port 5173)
│       └── src/
│           ├── App.jsx           Tab navigation
│           └── components/
│               ├── Encode.jsx    Create vault images
│               └── Decode.jsx    Decode vault images
├── extension/                    Chrome Extension (Manifest V3)
│   ├── manifest.json             Permissions & config
│   ├── content.js                All vault logic (LSB + AES-GCM + auto-fill)
│   ├── overlay.css               Modal styling
│   └── popup.html                Extension popup
├── result/                       Test output images
│   ├── input.png                 Original cover image
│   ├── vault_1.png               Single-password vault
│   ├── vault_2.png               Multi-password vault
│   └── vault_3.png               Updated vault
└── reports/                      Technical report
```

---

## ⚙️ How It Works — Technical Overview

### Binary Payload Format

Every StegnoPass v2 image encodes the same payload structure, regardless of which component created it:

```
┌──────────┬───────────┬───────────┬──────────────┬───────────┐
│ MAGIC(4) │ SALT(16)  │ NONCE(16) │ CIPHERTEXT(N)│  TAG(16)  │
│  "SPVT"  │  random   │  random   │  AES-GCM     │  GCM auth │
└──────────┴───────────┴───────────┴──────────────┴───────────┘
```

The full payload is **base64-encoded** before LSB embedding.

### Encryption Flow

1. User provides a **master passphrase**
2. A random **16-byte salt** is generated
3. **PBKDF2-SHA1** with 100,000 iterations derives a **32-byte AES-256 key**
4. A random **16-byte nonce** is generated
5. The JSON vault `{"site": "password", ...}` is encrypted with **AES-256-GCM**
6. Payload = `MAGIC || salt || nonce || ciphertext || tag` → **base64 encoded**
7. The payload string is embedded into the cover image via **LSB steganography**

### LSB Steganography

- Each character of the payload is converted to 8 bits
- A **32-bit header** encodes the total payload length
- Pixels are iterated left-to-right, top-to-bottom
- The **least significant bit** of each R, G, B channel is replaced with a payload bit (3 bits per pixel)
- Capacity: `width × height × 3` bits (a 1920×1080 image holds ~97 KB — more than enough)

---

## 🚀 Setup & Installation

### Python CLI

```bash
cd cli/
pip install -r requirements.txt
```

### Web Application

```bash
# Terminal 1 — Backend
cd stegnopass-web/backend
npm install
npm start
# Runs on http://localhost:3001

# Terminal 2 — Frontend
cd stegnopass-web/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Navigate to any login page, drag a vault PNG onto the password field

---

## 📋 CLI Usage

### Encode — Create a Vault Image

```bash
# Single password
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --add-password "gmail.com:MyGmailPass123" \
  --output vault.png

# Multiple passwords in one image
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --add-password "gmail.com:MyGmailPass123" \
  --add-password "github.com:MyGithubToken!" \
  --add-password "bank.com:Str0ngBankPass" \
  --output vault.png

# Update an existing vault (add more passwords)
python stegnopass.py encode \
  --image cover.png \
  --passphrase "my master secret" \
  --from-vault vault.png \
  --add-password "twitter.com:NewTwitterPass" \
  --output vault_updated.png
```

### Decode — Retrieve Passwords

```bash
# Get password for a specific site
python stegnopass.py decode \
  --image vault.png \
  --passphrase "my master secret" \
  --site gmail.com

# Show all passwords
python stegnopass.py decode \
  --image vault.png \
  --passphrase "my master secret"
```

### List — See Stored Sites

```bash
python stegnopass.py list \
  --image vault.png \
  --passphrase "my master secret"
```

---

## 🔬 Testing & Verification

The testing process verifies the complete encode → decode round-trip across all components and demonstrates cross-platform interoperability.

### Test 1: Single-Password Vault (CLI)

**Encode** a single password into a cover image:

```bash
python stegnopass.py encode \
  --image input.png \
  --passphrase "my master secret" \
  --add-password "gmail.com:MyGmailPass123" \
  --output vault_1.png
```

**Expected output:**
```
  ➕ gmail.com
✅ Vault image saved: vault_1.png
🔒 Vault contains 1 site(s)
```

**Decode** and verify:

```bash
python stegnopass.py decode \
  --image vault_1.png \
  --passphrase "my master secret" \
  --site gmail.com
```

**Expected output:**
```
🔓 Password for gmail.com: MyGmailPass123
```

### Test 2: Multi-Password Vault (CLI)

**Encode** multiple passwords into a single image:

```bash
python stegnopass.py encode \
  --image input.png \
  --passphrase "my master secret" \
  --add-password "gmail.com:MyGmailPass123" \
  --add-password "github.com:MyGithubToken!" \
  --add-password "bank.com:Str0ngBankPass" \
  --output vault_2.png
```

**Expected output:**
```
  ➕ gmail.com
  ➕ github.com
  ➕ bank.com
✅ Vault image saved: vault_2.png
🔒 Vault contains 3 site(s)
```

**Decode all** and verify:

```bash
python stegnopass.py decode \
  --image vault_2.png \
  --passphrase "my master secret"
```

**Expected output:**
```
🔓 Vault decrypted — 3 entries:
   gmail.com: MyGmailPass123
   github.com: MyGithubToken!
   bank.com: Str0ngBankPass
```

### Test 3: Vault Update (CLI)

**Load** an existing vault and **add** a new entry:

```bash
python stegnopass.py encode \
  --image input.png \
  --passphrase "my master secret" \
  --from-vault vault_2.png \
  --add-password "twitter.com:NewTwitterPass" \
  --output vault_3.png
```

**Expected output:**
```
📂 Loaded existing vault with 3 entries
  ➕ twitter.com
✅ Vault image saved: vault_3.png
🔒 Vault contains 4 site(s)
```

**List** all sites:

```bash
python stegnopass.py list \
  --image vault_3.png \
  --passphrase "my master secret"
```

**Expected output:**
```
📋 Sites in vault (4):
   • gmail.com
   • github.com
   • bank.com
   • twitter.com
```

### Test 4: Wrong Passphrase (Security Verification)

```bash
python stegnopass.py decode \
  --image vault_1.png \
  --passphrase "wrong passphrase"
```

**Expected output:**
```
❌ Error: MAC check failed
```

This confirms that **AES-256-GCM rejects** unauthorized decryption attempts — the GCM authentication tag prevents any data from being revealed.

### Test 5: Chrome Extension (Cross-Platform)

1. Load the extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked)
2. Navigate to any website with a login form (e.g., `gmail.com`)
3. **Drag** `vault_2.png` onto the password field
4. Enter the master passphrase: `my master secret`
5. The extension:
   - Extracts the hidden payload via LSB steganography
   - Decrypts the AES-256-GCM vault using the Web Crypto API
   - Auto-detects the current site via `window.location.hostname`
   - **Fills the password field automatically**

This test confirms **cross-platform interoperability** — a vault created by the Python CLI is successfully decoded by the browser extension using completely different crypto libraries (pycryptodome vs. Web Crypto API).

### Test 6: Web Application

1. Start the backend: `cd stegnopass-web/backend && npm install && npm start`
2. Start the frontend: `cd stegnopass-web/frontend && npm install && npm run dev`
3. Open `http://localhost:5173`
4. **Encode tab:** Upload a cover image, add passwords, set a passphrase → download vault PNG
5. **Decode tab:** Upload the vault PNG, enter passphrase → see decrypted passwords

### Test Results Summary

| Test | Component | Result |
|---|---|---|
| Single-password encode/decode | CLI | ✅ Pass |
| Multi-password encode/decode | CLI | ✅ Pass |
| Vault update (add entries) | CLI | ✅ Pass |
| Wrong passphrase rejection | CLI | ✅ Pass |
| Cross-platform decode | Extension | ✅ Pass |
| Web encode/decode | Web App | ✅ Pass |
| Image visual integrity | All | ✅ Pass — output images are visually identical to input |

---

## 🔒 Security Model

| Property | Implementation |
|---|---|
| **Encryption** | AES-256-GCM (authenticated, tamper-proof) |
| **Key Derivation** | PBKDF2-SHA1, 100,000 iterations |
| **Salt** | 16 bytes, random per vault |
| **Nonce** | 16 bytes, random per encode |
| **Steganography** | LSB substitution (3 bits/pixel) |
| **Network Traffic** | Zero — all operations are local |
| **Format Marker** | `SPVT` magic bytes for version detection |
| **Cross-Platform** | Identical payload format across Python, Node.js, and Web Crypto API |

---

## 👥 Team

| Name | Department |
|---|---|
| Ashraf Mohamed Abobaker | Computer |
| Amr Khaled Kamel | Computer |
| Mohamed Ashraf Abdelmaqsoud | Computer |
| Ahmad Mohamed Elmitwalli | Computer |
| Ziad Bilal Gamal | Communication |
| Joseph Lotfy | Communication |

**Course:** Information Security (CS-SEC)
**Supervisor:** Eng. Mohammed Nawar

---

## 📚 References

- NIST SP 800-132 — Recommendation for Password-Based Key Derivation (2010)
- NIST SP 800-38D — Recommendation for Block Cipher Modes: GCM (2007)
- OWASP Password Storage Cheat Sheet (2023)
- Fridrich, Goljan & Du — Detecting LSB Steganography in Color and Grayscale Images (IEEE, 2001)
- Chrome Manifest V3 Documentation
- Web Crypto API (MDN)
- pycryptodome Documentation

---

## 📄 License

This project was developed as an academic project for the Information Security course.
