# 🔥 AI-Powered Network Topology Analyzer

An end-to-end web application that uses **Computer Vision and Graph Analysis** to automatically detect, reconstruct, and analyze network topologies from diagram images.

---

## 🚀 Overview

This project converts network diagrams into structured graph representations using AI.
It detects devices, identifies connections, builds a network graph, classifies topology, and provides **security insights with explainable outputs**.

---

## 🧠 Key Features

* 📸 Upload network diagram images
* 🧩 Detect devices (router, switch, hub, computer) using YOLO
* 🔗 Identify connections using:

  * Hough Transform
  * Pixel Sampling
  * Skeletonization
* 🕸️ Build graph using NetworkX
* 📊 Classify topology:

  * Star
  * Bus
  * Mesh
  * Tree
  * Hybrid
* 🛡️ Security analysis (basic structural risk detection)
* 🎬 Step-by-step visualization:

  * Device detection
  * Connection mapping
  * Graph construction
  * Topology detection
* 📈 Confidence display (based on detection methods)

---

## 🏗️ Project Structure

```
NETWORK-TOPOLOGY-APP/
│
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI server (API endpoints)
│   │   ├── model.py       # Core CV pipeline (YOLO + OpenCV + Graph)
│   │   ├── utils.py       # Helper functions (processing, filtering)
│   │   ├── runs/          # Trained YOLO model weights
│   │   │   └── detect/train5/weights/best.pt
│   │
│   └── venv/              # Python virtual environment
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadPage.jsx
│   │   │   ├── AnalysisPage.jsx
│   │   │   ├── ImageDetectionSection.jsx
│   │   │   ├── ConnectionsSection.jsx
│   │   │   ├── GraphSection.jsx
│   │   │   ├── TopologySection.jsx
│   │   │   ├── SecuritySection.jsx
│   │   │   └── IntroPage.jsx
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
└── README.md
```

---

## ⚙️ Tech Stack

### 🔹 Backend

* Python
* FastAPI
* OpenCV
* NetworkX
* Ultralytics YOLO

### 🔹 Frontend

* React (Vite)
* JavaScript
* CSS (custom UI + animations)

---

## 🧠 How It Works

1. **Image Upload**

   * User uploads a network diagram

2. **Device Detection**

   * YOLO model detects:

     * Routers
     * Switches
     * Hubs
     * Computers

3. **Connection Detection**

   * Uses 3 methods:

     * Hough Transform (straight lines)
     * Pixel Sampling (line validation)
     * Skeletonization (complex paths)

4. **Graph Construction**

   * Devices → Nodes
   * Connections → Edges
   * Built using NetworkX

5. **Topology Detection**

   * Graph properties analyzed:

     * Degree distribution
     * Connectivity
     * Structure

6. **Security Analysis**

   * Detects structural issues like:

     * Single point of failure
     * Weak connectivity
     * Unoptimized structure

7. **Visualization**

   * Step-by-step UI showing:

     * Detection
     * Connections
     * Graph
     * Final topology

---

## 📊 Model & Dataset

* Custom YOLO model trained on a **self-created dataset**
* Dataset includes:

  * Network diagram images
  * Annotated devices (routers, switches, computers, hubs)

Model path:

```
backend/app/runs/detect/train5/weights/best.pt
```

---

## ▶️ Running the Project

### 🔹 Backend

```bash
cd backend
source venv/bin/activate   # or venv\Scripts\activate (Windows)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

### 🔹 Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 API Endpoint

### POST /predict

**Input:**

* Image file

**Output:**

```json
{
  "nodes": [],
  "edges": [],
  "topology": "Hybrid",
  "explanation": "...",
  "security_warnings": []
}
```

---

## 🎯 Use Cases

* Network analysis and visualization
* Educational tools for computer networks
* Automated diagram understanding
* Infrastructure planning support

---

## ⚠️ Limitations

* Works best on structured network diagrams
* Not optimized for real-world physical network images
* Accuracy depends on diagram clarity

---

## 🚀 Future Improvements

* Support hand-drawn diagrams
* Real-time camera input
* Advanced security analysis
* Editable graph interface

---

## 👨‍💻 Author

Developed as part of a Computer Vision project.

---

## ⭐ Final Note

This project demonstrates the integration of **Computer Vision, Graph Theory, and Web Development** to build an explainable AI system for network topology analysis.
