import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000/api"
});

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

const DEFAULT_LANGUAGES = ["all", "hindi", "english", "telugu", "tamil", "malayalam", "kannada"];

const DEFAULT_GENRES = [
  "all",
  "action",
  "adventure",
  "comedy",
  "drama",
  "romance",
  "horror",
  "thriller",
  "mystery",
  "science fiction",
  "fantasy",
  "animation",
  "family",
  "crime",
  "biography",
  "historical",
  "war",
  "musical",
  "sports",
  "documentary",
  "western",
  "superhero",
  "psychological",
  "noir",
  "disaster",
  "survival"
];

const LABEL_MAP = {
  all: "All",
  hindi: "Hindi",
  english: "English",
  telugu: "Telugu",
  tamil: "Tamil",
  malayalam: "Malayalam",
  kannada: "Kannada",
  action: "Action",
  adventure: "Adventure",
  comedy: "Comedy",
  drama: "Drama",
  romance: "Romance",
  horror: "Horror",
  thriller: "Thriller",
  mystery: "Mystery",
  "science fiction": "Science Fiction (Sci-Fi)",
  fantasy: "Fantasy",
  animation: "Animation",
  family: "Family",
  crime: "Crime",
  biography: "Biography (Biopic)",
  historical: "Historical",
  war: "War",
  musical: "Musical",
  sports: "Sports",
  documentary: "Documentary",
  western: "Western",
  superhero: "Superhero",
  psychological: "Psychological",
  noir: "Noir",
  disaster: "Disaster",
  survival: "Survival"
};

const titleCase = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

export default function App() {
  const [file, setFile] = useState(null);
  const [uploadRef, setUploadRef] = useState("");
  const [language, setLanguage] = useState("all");
  const [genre, setGenre] = useState("all");
  const [languageOptions, setLanguageOptions] = useState(DEFAULT_LANGUAGES);
  const [genreOptions, setGenreOptions] = useState(DEFAULT_GENRES);
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [uploadedThisSession, setUploadedThisSession] = useState(false);

  const requestRecommendations = async (targetUploadId, targetLanguage, targetGenre) => {
    const res = await api.post("/recommend", {
      uploadId: targetUploadId,
      topN: 12,
      language: targetLanguage,
      genre: targetGenre
    });

    setRecommendations(res.data.recommendations || []);
    if (res.data.filter_options?.languages?.length) {
      setLanguageOptions(res.data.filter_options.languages);
    }
    if (res.data.filter_options?.genres?.length) {
      setGenreOptions(res.data.filter_options.genres);
    }
    return res;
  };

  const handleRecommend = async (forcedUploadId, forcedLanguage, forcedGenre) => {
    const selectedUploadId = forcedUploadId || uploadRef;
    const selectedLanguage = forcedLanguage ?? language;
    const selectedGenre = forcedGenre ?? genre;
    if (!selectedUploadId) {
      setMessage("Please upload and analyze a dataset first.");
      setMessageType("error");
      return;
    }

    setLoadingRecommend(true);
    setMessage("");
    setMessageType("info");
    try {
      const res = await requestRecommendations(selectedUploadId, selectedLanguage, selectedGenre);
      setShowRecommendations(true);
      if (res.data.message) {
        setMessage(res.data.message);
        setMessageType("info");
      }
    } catch (err) {
      setRecommendations([]);
      setMessage(err.response?.data?.message || "Recommendation failed.");
      setMessageType("error");
    } finally {
      setLoadingRecommend(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoadingUpload(true);
    setMessage("");
    setMessageType("info");

    const formData = new FormData();
    formData.append("dataset", file);

    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const nextUploadId = res.data.upload.uploadId;
      setUploadRef(nextUploadId);
      setUploadedThisSession(true);
      await handleRecommend(nextUploadId, language, genre);
      setShowRecommendations(true);
      setMessage("Dataset uploaded, analyzed, and recommendations generated.");
      setMessageType("success");
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed.");
      setMessageType("error");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleDownloadCleanedCsv = async () => {
    if (!uploadRef || !uploadedThisSession) return;
    setLoadingDownload(true);
    setMessage("");
    setMessageType("info");

    try {
      const res = await api.get(`/uploads/${uploadRef}/cleaned-csv`, {
        responseType: "blob"
      });

      const contentDisposition = res.headers["content-disposition"] || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || "cleaned_dataset.csv";

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to download cleaned CSV.");
      setMessageType("error");
    } finally {
      setLoadingDownload(false);
    }
  };

  const onLanguageChange = async (nextLanguage) => {
    setLanguage(nextLanguage);
    if (!uploadedThisSession || !uploadRef) return;
    await handleRecommend(uploadRef, nextLanguage, genre);
  };

  const onGenreChange = async (nextGenre) => {
    setGenre(nextGenre);
    if (!uploadedThisSession || !uploadRef) return;
    await handleRecommend(uploadRef, language, nextGenre);
  };

  return (
    <div className="app-shell">
      <div className="bg-layer" />
      <main className="container">
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero">
          <h1>Movie Recommendation</h1>
          <p>Upload a dataset first. Recommendations are shown after analysis.</p>
        </motion.header>

        <motion.section variants={cardAnim} initial="hidden" animate="show" className="card">
          <h2>Upload Dataset</h2>
          <div className="upload-row">
            <input
              className="file-picker"
              type="file"
              accept=".csv,.tsv,.txt,.xls,.xlsx,.json,.jsonl"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button onClick={handleUpload} disabled={!file || loadingUpload}>
              {loadingUpload ? "Processing..." : "Get Recommendation"}
            </button>
            <button
              className="secondary-btn"
              onClick={handleDownloadCleanedCsv}
              disabled={!uploadRef || !uploadedThisSession || loadingDownload}
            >
              {loadingDownload ? "Downloading..." : "Download Clean CSV"}
            </button>
          </div>

          {message && <p className={`status ${messageType}`}>{message}</p>}
        </motion.section>

        {showRecommendations && (
          <motion.section variants={cardAnim} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="card">
            <h2>Top Rated Movie Recommendations</h2>
            <div className="recommend-grid">
              <div className="field-wrap">
                <label>Language</label>
                <select value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                  {languageOptions.map((item) => (
                    <option key={item} value={item}>
                      {LABEL_MAP[item] || titleCase(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-wrap">
                <label>Category</label>
                <select value={genre} onChange={(e) => onGenreChange(e.target.value)}>
                  {genreOptions.map((item) => (
                    <option key={item} value={item}>
                      {LABEL_MAP[item] || titleCase(item)}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={() => handleRecommend()} disabled={loadingRecommend || !uploadRef || !uploadedThisSession}>
                {loadingRecommend ? "Finding..." : "Refresh Recommendations"}
              </button>
            </div>

            <div className="recommend-results">
              {recommendations.length === 0 && <p className="muted">No movies found for selected language/category.</p>}
              {recommendations.map((item, idx) => (
                <article key={`${item.title}-${idx}`} className="movie-card">
                  <div className="inline-head">
                    <h4>
                      #{idx + 1} {item.title}
                    </h4>
                    <span className="rating-pill">{Number(item.score).toFixed(1)}</span>
                  </div>
                  <div className="movie-meta">
                    <span className="meta-pill">{item.language || "other"}</span>
                    <span className="meta-pill">{item.genre || "unknown"}</span>
                    {item.year ? <span className="meta-pill">{item.year}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}
