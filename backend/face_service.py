import base64
import os
import uuid
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from deepface import DeepFace

app = FastAPI()

DB_PATH = "face_db"
os.makedirs(DB_PATH, exist_ok=True)

class RegisterRequest(BaseModel):
    imageData: str
    personName: str
    relationship: str

class RecognizeRequest(BaseModel):
    imageData: str

def decode_image(base64_string: str) -> np.ndarray:
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img

@app.post("/face/register")
async def register_face(req: RegisterRequest):
    try:
        img = decode_image(req.imageData)
        
        # Verify a face exists
        faces = DeepFace.extract_faces(img_path=img, enforce_detection=True)
        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        # Save to db
        face_id = str(uuid.uuid4())
        safe_name = req.personName.replace(" ", "_").replace("/", "").replace("\\", "")
        safe_rel = req.relationship.replace(" ", "_").replace("/", "").replace("\\", "")
        filename = f"{face_id}__{safe_name}__{safe_rel}.jpg"
        filepath = os.path.join(DB_PATH, filename)
        
        cv2.imwrite(filepath, img)
        
        # Remove old representations cache so DeepFace updates embeddings
        pkl_path = os.path.join(DB_PATH, "representations_facenet.pkl")
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
            
        return {"success": True, "message": "Face registered successfully", "face_id": face_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/face/recognize")
async def recognize_face(req: RecognizeRequest):
    try:
        # Check if DB has any images
        image_files = [f for f in os.listdir(DB_PATH) if f.endswith(".jpg") or f.endswith(".png")]
        if len(image_files) == 0:
            return {"success": False, "error": "No registered faces in database."}

        img = decode_image(req.imageData)
        
        # Save temp image for DeepFace
        temp_path = f"temp_recognize_{uuid.uuid4().hex[:8]}.jpg"
        cv2.imwrite(temp_path, img)
        
        try:
            dfs = DeepFace.find(img_path=temp_path, db_path=DB_PATH, model_name="Facenet", enforce_detection=False, silent=True)
            
            if len(dfs) == 0 or dfs[0].empty:
                os.remove(temp_path)
                return {"success": False, "error": "No matches found"}
                
            df = dfs[0]
            results = []
            
            for _, row in df.iterrows():
                identity = row["identity"]
                basename = os.path.basename(identity)
                parts = basename.replace(".jpg", "").replace(".png", "").split("__")
                
                face_id = parts[0] if len(parts) > 0 else "unknown"
                person_name = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"
                relationship = parts[2].replace("_", " ") if len(parts) > 2 else "Unknown"
                
                distance = row.get("distance", 0)
                threshold = row.get("threshold", 0.40)
                confidence = max(0.0, min(1.0, 1.0 - (distance / (threshold * 2.5))))
                
                # Boost confidence slightly for UI display purposes
                confidence = min(0.99, confidence + 0.15)
                
                results.append({
                    "face_id": face_id,
                    "person_name": person_name,
                    "relationship": relationship,
                    "confidence": round(confidence, 3)
                })
                
            os.remove(temp_path)
            return {"success": True, "results": results}
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return {"success": False, "error": str(e)}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
