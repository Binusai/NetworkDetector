from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.model import run_pipeline

app = FastAPI(title="Network Topology Detector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 🔥 FIXED
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Network Topology API is running"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    image_bytes = await file.read()
    result = run_pipeline(image_bytes)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result