<h1 align="center">🎬 Movie Recommendation System</h1>

<p align="center">
  <b>Dataset Upload, Cleaning, Analysis, and Movie Recommendations</b><br/>
  Full-stack app to upload movie datasets and generate top-rated recommendations.
</p>

<p align="center">
  ⚛️ React • ⚡ Vite • 🟢 Node.js • 🐍 Python • 📊 scikit-learn
</p>

---

## ✨ Overview

**Movie Recommendation System** is a full-stack project that allows users to upload movie datasets and get filtered recommendations.

It includes:
- 📁 Dataset upload support (`.csv`, `.tsv`, `.txt`, `.xls`, `.xlsx`, `.json`, `.jsonl`)
- 🧹 Dataset cleaning and preprocessing (Python pipeline)
- 📌 Analysis summary (rows, columns, cleaned rows)
- 🎯 Top-rated recommendations with language and genre filters
- ⬇️ Cleaned CSV download

---

## 🌟 Features

- 📤 **Dataset Upload & Validation**  
  Upload up to 100 MB files with format validation.

- 🧠 **Python-Powered Processing**  
  Uses `pandas` + `scikit-learn` scripts for cleaning, analysis, and recommendation generation.

- 🎬 **Filtered Recommendations**  
  Get recommendations by **language** and **genre** after upload.

- 📊 **Analysis + Preview APIs**  
  Includes endpoints for analysis output and cleaned preview data.

- ⬇️ **Cleaned CSV Download**  
  Download the cleaned dataset from the app.

- 📱 **Responsive Frontend**  
  Modern React UI with animated cards and clean layout.

---

## 🛠 Tech Stack

<p align="center">
  <img src="https://skillicons.dev/icons?i=react,vite,nodejs,express,python,mongodb,github" />
</p>

- **Frontend:** React + Vite + Axios + Framer Motion  
- **Backend:** Node.js + Express + Multer  
- **Python Service:** pandas + scikit-learn  
- **Storage:** Local upload store (optional MongoDB metadata)  
- **Process:** Backend orchestrates Python scripts for analysis and recommendations

---

## 📁 Project Structure

- `client/` React + Vite frontend
- `server/` Express API + upload handling
- `python-service/` Dataset cleaning, analysis, recommendation scripts
- `data/movie_dataset.csv` Sample/default movie dataset

---

## ⚡ Installation & Setup

Follow these steps to run the project locally:

```bash
# 1️⃣ Clone the repository
git clone <your-repo-url>

# 2️⃣ Navigate to the project folder
cd "DSBD Mini Project 2"

# 3️⃣ Install all dependencies (root + server + client + python)
npm run install:all

# If needed, install Python dependencies manually:
# pip install -r python-service/requirements.txt
```

---

## 🔧 Environment Variables

Create these files:

- `server/.env`
- `client/.env`

Use the following values:

```env
# server/.env
PORT=5000
MONGO_URI=
PYTHON_BIN=python
```

```env
# client/.env
VITE_API_BASE=http://localhost:5000/api
```

---

## ▶️ Run the App

```bash
# Run client + server together
npm run dev
```

or run separately:

```bash
npm run dev:server
npm run dev:client
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:5000/api`

---

---

## 📸 Screenshot

![Application Screenshot](./screenshots/Output.png)

---

## 🔌 Core API Endpoints

- `GET /api/health`
- `GET /api/uploads`
- `POST /api/upload` (multipart field: `dataset`)
- `GET /api/uploads/:uploadId/cleaned-csv`
- `GET /api/uploads/:uploadId/cleaned-preview?page=1&pageSize=10`
- `DELETE /api/uploads/:uploadId`
- `POST /api/recommend`

### Example `POST /api/recommend` payload

```json
{
  "uploadId": "your-upload-id",
  "topN": 12,
  "language": "all",
  "genre": "all"
}
```


## 🚀 Deployment

You can deploy:

- Frontend on **Vercel / Netlify / GitHub Pages**
- Backend on **Render / Railway / VPS**
- Ensure Python runtime is available on backend host

---

## 👨‍💻 Author

**Chetan More**

