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

2. Encode (create a vault image)
Create a vault with multiple sites

python stegnopass.py encode ^
  --image cover.png ^
  --passphrase "my master secret" ^
  --add-password "gmail.com:MyGmailPass123" ^
  --add-password "github.com:MyGithubToken!" ^
  --add-password "bank.com:Str0ngBankPass" ^
  --output vault.png
