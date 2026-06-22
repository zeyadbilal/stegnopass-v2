# StegnoPass v2 — Web Edition

Web-based password vault using steganography + AES-256-GCM.

## Structure

```
stegnopass-web/
├── backend/          Express.js API server (port 3001)
│   ├── server.js     Routes: POST /api/encode, POST /api/decode
│   └── utils/
│       ├── crypto.js AES-256-GCM encrypt/decrypt (PBKDF2-SHA1)
│       └── stego.js  LSB steganography embed/extract
└── frontend/         React + Vite app (port 5173)
    └── src/
        ├── App.jsx
        └── components/
            ├── Encode.jsx   Create vault images
            └── Decode.jsx   Extract passwords from vault images
```

## How to run

### 1. Backend

```bash
cd stegnopass-web/backend
npm install
npm start
# Runs on http://localhost:3001
```

### 2. Frontend (separate terminal)

```bash
cd stegnopass-web/frontend
npm install
npm run dev
# Runs on http://localhost:5173 (proxies API to :3001)
```

Open the frontend URL in a browser.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/encode` | POST | Upload cover image + passwords → download vault PNG |
| `/api/decode` | POST | Upload vault image + passphrase → get decrypted passwords |

## Compatibility

Backend crypto is compatible with the Python CLI version — vault images created by one can be decoded by the other.
