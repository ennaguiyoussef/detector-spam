import os
import re
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
from gensim.models import FastText
from gensim.parsing.preprocessing import STOPWORDS

# Initialisation Flask + CORS (pour autoriser React)
app = Flask(__name__)
CORS(app)

# Chemins relatifs au fichier app.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FT_MODEL_PATH = os.path.join(BASE_DIR, "fasttext_spam_model.model")
PIPELINE_PATH = os.path.join(BASE_DIR, "spam_detector_pipeline.pkl")

# Chargement des modèles au démarrage (une seule fois)
print("🔄 Loading models...")
ft_model = FastText.load(FT_MODEL_PATH)
pipeline = joblib.load(PIPELINE_PATH)
mlp = pipeline['mlp']
scaler = pipeline['scaler']

stop_words = STOPWORDS
print("✅ Models loaded successfully.")


# 🔹 Fonction de prétraitement EXACTEMENT identique au notebook
def preprocess_and_embed(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    text = re.sub(r'\S+@\S+', '', text)
    text = re.sub(r'@\w+|#\w+', '', text)
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\b\d+\b', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    tokens = text.split()
    tokens = [w for w in tokens if w not in stop_words]

    # Embedding + Moyenne
    vectors = [ft_model.wv[w] for w in tokens if w in ft_model.wv]
    if not vectors:
        return np.zeros(ft_model.vector_size)
    return np.mean(vectors, axis=0)


# 🌐 Route API
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Missing 'message' field"}), 400

    message = data["message"].strip()
    if not message:
        return jsonify({"error": "Empty message"}), 400

    try:
        # 1. Prétraitement + Embedding
        vec = preprocess_and_embed(message)
        vec_2d = vec.reshape(1, -1)  # MLP attend une matrice 2D

        # 2. Scaling (identique au train)
        vec_scaled = scaler.transform(vec_2d)

        # 3. Prédiction MLP
        pred = mlp.predict(vec_scaled)[0]
        proba = mlp.predict_proba(vec_scaled)[0]

        # 4. Réponse JSON
        return jsonify({
            "prediction": "spam" if pred == 1 else "ham",
            "confidence": round(float(proba[pred]), 4),
            "probabilities": {"ham": round(float(proba[0]), 4), "spam": round(float(proba[1]), 4)}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)