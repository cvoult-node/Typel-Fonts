# Typel Fonts — Pixel Font Studio

**![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)**

Crea, edita y comparte fuentes pixel art directamente desde tu navegador.
Rápido, moderno y pensado para creadores.

---

## ✨ Features

* Editor de glifos pixel a pixel
* Previsualización en tiempo real
* Exportación de fuentes (OTF / TTF)
* Feed de fuentes de la comunidad
* Sistema de autenticación
* Interfaz optimizada y ligera

---

## 🚀 Visión

Typel Fonts busca convertirse en una plataforma completa para la creación y distribución de fuentes pixel art.

Próximamente:

* Marketplace de fuentes
* Perfiles públicos de creadores
* Funciones avanzadas de exportación
* Opciones premium

---

## 🧱 Stack

* **Frontend**: Vanilla JS + React (ESM) + Vite
* **Backend / DB**: Firebase (Authentication + Firestore)
* **Fuentes**: opentype.js

---

## ⚙️ Instalación

```bash
npm install
```

---

## 🧪 Desarrollo

```bash
npm run dev
```

Abrir en:

```
http://localhost:3000
```

---

## 📦 Build

```bash
npm run build
```

---

## 🔐 Configuración

1. Copia el archivo de entorno:

```bash
cp .env.example .env
```

2. Configura Firebase en:

```
src/env.js
```

Usa `src/env.example` como referencia.

---

## 📁 Estructura

```
src/
  App.js
  Editor.js
  Feed.js
  firebase.js
  canvas.js
  pixelRenderer.js
  publish.js
  navbar-shared.js
  shared.css
  constants.js
  ui.js
  env.js (no subir)
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas.
Puedes abrir issues o pull requests para mejorar el proyecto.

---

## 📄 Licencia

MIT — libre para uso, modificación y distribución.

---

## ⚠️ Nota

Este proyecto es open source, pero la plataforma Typel Fonts puede incluir funcionalidades adicionales, servicios o integraciones no incluidas en este repositorio.

---

## 🚀 Typel Fonts

Diseña fuentes. Comparte ideas. Construye algo único.
