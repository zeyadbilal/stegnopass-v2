# StegnoPass v2 — Encrypted Password Vault Hidden in Images (Steganography + AES-256-GCM)

**StegnoPass v2** is a password vault system that securely hides credentials inside a *single image* using **LSB steganography**, while protecting the hidden data with **AES-256-GCM** (authenticated encryption).

The project includes:
- **Python CLI** for creating and extracting vaults
- **Browser Extension** for quick auto-fill on password fields (drag & drop workflow)
- **Web Edition** (Express + React) to encode/decode vault images via browser UI

---

## Key Features

### 🔐 Cryptography (Security)
- **AES-256-GCM** encryption (provides confidentiality + integrity)
- **PBKDF2** key derivation (PBKDF2-SHA1), using a randomly generated salt
- Correct decryption requires the correct passphrase (wrong passphrase fails integrity verification)

### 🖼️ Steganography (Hiding)
- **LSB embedding** stores the encrypted payload inside an image’s RGB channels
- The resulting PNG looks like a normal image without the passphrase

### 🧰 Multi-password vault (v2 capability)
- One image contains a vault mapping:  
  **`{ site -> password }`** stored as a single encrypted JSON payload
- The CLI and web API can:
  - **encode** (create a vault image)
  - **decode** (extract + decrypt)
  - **list** stored sites

### 🧩 Compatibility
- v2 uses a distinct **magic header** to identify supported vault payloads:
  - **Magic bytes:** `SPVT`
- Decryption validates the header and fails if the image is not a supported StegnoPass payload.

---

## Architecture Overview

### 1) Python CLI (`cli/`)
Responsible for:
- LSB embed/extract
- AES-256-GCM encryption/decryption
- Vault JSON packing/unpacking
- Multi-entry encoding and selective decoding

**Main concepts in implementation:**
- Payload format:
  - `MAGIC(4 bytes "SPVT") + salt(16) + nonce(16) + ciphertext + tag(16)`
- Payload is base64-encoded and embedded bit-by-bit into RGB least significant bits.

### 2) Web Edition (`stegnopass-web/`)
- **Backend (Express.js)** handles:
  - `POST /api/encode`: upload cover image + passphrase + passwords → returns a generated vault PNG
  - `POST /api/decode`: upload vault image + passphrase (+ optional site) → returns decrypted entries
- **Frontend (React + Vite)** provides UI for encode/decode workflows.

Backend endpoints are implemented in:
- `stegnopass-web/backend/server.js`

### 3) Browser Extension (`extension/`)
- Loads a hidden payload from the selected/dragged vault image
- Decrypts locally using the master passphrase
- Uses current `window.location.hostname` (site) to determine which password to fill

> Note: Extension files are present in the repository; enable it in Chrome/Chromium using Developer Mode (see Testing).

---

## Security Model (What protects you)

- **Authenticated encryption (AES-GCM)**: tampered/incorrect payloads will not decrypt successfully.
- **Passphrase-based key derivation (PBKDF2)**: brute-force resistance improves via iterative hashing + salt.
- **No network dependency** for encoding/decoding in the CLI workflow (all local computation).
- **Stego header validation** using magic bytes `SPVT` to distinguish v2 vault payloads.

---

## Requirements

### Python CLI prerequisites
- Python 3.x
- Dependencies listed in `cli/requirements.txt`, including:
  - `Pillow` (image IO)
  - `pycryptodome` (AES-GCM + PBKDF2)
  - `numpy/scipy` (as included in the project requirements)

---

## Testing / How to Run

## A) Test the Python CLI (recommended baseline)

### 1. Install Python dependencies
From the project root:
```bash
cd cli
pip install -r requirements.txt
```
### 2. Encode (create a vault image)
Create a vault with multiple sites 
```bash
python stegnopass.py encode ^
  --image cover.png ^
  --passphrase "my master secret" ^
  --add-password "gmail.com:MyGmailPass123" ^
  --add-password "github.com:MyGithubToken!" ^
  --add-password "bank.com:Str0ngBankPass" ^
  --output vault.png

  PowerShell users may replace ^ line continuations with backticks `.
```
### 3. Decode (extract one site)
```bash
python stegnopass.py decode ^
  --image vault.png ^
  --passphrase "my master secret" ^
  --site gmail.com
```
### 4. Decode (show all entries)
```bash
python stegnopass.py decode ^
  --image vault.png ^
  --passphrase "my master secret"
```
### 5. List stored sites only
```bash
python stegnopass.py list ^
  --image vault.png ^
  --passphrase "my master secret"
```
### 6. Update an existing vault (add entries without losing existing ones)
```bash
python stegnopass.py encode ^
  --image cover.png ^
  --passphrase "my master secret" ^
  --from-vault vault.png ^
  --add-password "twitter.com:NewTwitterPass" ^
  --output vault_updated.png
Expected result: the updated output image contains the previous vault entries plus the new ones.
```
## B) Test the Web Edition (Express + React)

### 1. Run backend
```bash
cd stegnopass-web/backend
npm install
npm start
Backend listens on:
```
http://localhost:3001

### 2. Run frontend
```bash
cd stegnopass-web/frontend
npm install
npm run dev
Frontend listens on:
```
http://localhost:5173

### 3. Use the UI

Open the frontend URL in your browser
Upload a cover image
Enter the passphrase and password entries
Encode → download the generated stego vault PNG
Decode → upload vault PNG + passphrase (+ site if supported by UI)

## C) Test the Browser Extension (Chrome/Chromium)
Open Chrome:
chrome://extensions
Enable Developer mode
Click Load unpacked
Select the repository’s extension/ folder
In any website that has a password input field:
Drag and drop the generated vault.png onto the password field
Provide the master passphrase when prompted
The extension auto-fills the matching password for the current domain (or allows selection if needed)
Troubleshooting
“Not a StegnoPass image (wrong magic bytes)”

The provided image does not contain a StegnoPass v2 payload
Ensure you are decoding an image generated by StegnoPass v2
Decryption fails / wrong passphrase

AES-GCM integrity check will fail if the passphrase is incorrect or payload is altered
Re-check the master passphrase
Image too small error (CLI encoding)

LSB embedding requires capacity proportional to payload size
Use a larger cover image (higher resolution)
Project Structure
README.md — documentation
cli/ — Python CLI encoder/decoder
extension/ — browser extension for drag-and-drop decoding + auto-fill
stegnopass-web/ — web UI + API server for encode/decode workflows
reports/ and result/ — artifacts from testing/experiments (if present)
