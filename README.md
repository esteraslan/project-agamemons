# 🌌 Agamemons Portal: The DevTechOps Knight's Grimoire

[![Docker Confirmed](https://img.shields.io/badge/Docker-Enabled-blue?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **"Mantra adalah kode, dan Container adalah benteng."**

Selamat datang di **Agamemons Portal**, sebuah sistem portfolio RPG-style yang dibangun untuk menampilkan mastery di bidang IT Service Desk, Cloud Infrastructure, dan Game Development. Portal ini terintegrasi dengan **Google Firestore** sebagai database "Ancient Scrolls" dan berjalan sepenuhnya di atas **Docker**.

---

## 🛠️ Tech Stack (The Armory)

* **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Dark Fantasy Aesthetic).
* **Backend:** ASP.NET Core 8.0 (RESTful API) dengan C#.
* **Database:** Google Cloud Firestore (Remote Persistence).
* **Infrastructure:** Docker & Docker Compose.
* **Orchestration:** Kubernetes Ready (`agamemons-k8s.yaml`).

---

## 🚀 Deployment (Summoning the Portal)

Portal ini dirancang untuk berjalan secara terisolasi menggunakan Docker Compose.

### 1. Prasyarat
* **Docker & Docker Compose** terinstal (Linux/WSL2 sangat disarankan).
* File `firebase-key.json` (Kunci akses Google Cloud Service Account) harus diletakkan di root folder agar Backend bisa melakukan ritual sinkronisasi data.

### 2. Build & Run
Gunakan Docker Compose untuk membangun image dan menjalankan container secara otomatis:

```bash
# Summon the portal via Docker Compose
docker-compose up -d --build