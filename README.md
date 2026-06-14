![CortexFlow Banner](frontend/public/images/CortexFlow%20(1).png)

CortexFlow is a highly sophisticated, full-stack cognitive signal analysis platform designed for seamless screening workflows from text and speech. By bridging state-of-the-art AI transcription capabilities with deterministic linguistic feature extraction, CortexFlow transforms raw audio and text into structured, domain-level neurological insights.

## ✨ The CortexFlow Ecosystem

CortexFlow isn't just an analysis tool; it is a massive, interconnected digital health ecosystem. We built a unified data layer that seamlessly syncs insights, communications, and alerts across three distinct, highly specialized dashboards.

### 🧠 Patient Portal
Designed for low-friction self-monitoring and cognitive autonomy.
- **Cognitive Assessments**: Real-time multimodal input (text or browser-based voice capture) driving immediate neurological screening.
- **Memory Lane**: A secure digital vault for patients to record, playback, and review their historical cognitive scores and session memories.
- **Safety Center & Health Tasks**: Automated tracking of daily wellness routines and emergency response protocols.
- **Access Control Center**: Granular permissions system allowing patients to approve or revoke access for specific caregivers and healthcare providers.

### 🩺 Healthcare Provider Dashboard
A clinical-grade command center for neurologists and care teams.
- **Intelligent Roster Management**: High-level views of all linked patients with aggregate severity scores and trend indicators.
- **Deep Speech Analysis**: Access to raw transcriptions, pause-map timings, and deterministic scores across lexical, semantic, prosody, syntax, and affective domains.
- **Longitudinal Trend Tracking**: Advanced data visualization (via Recharts) mapping patient cognitive decline or improvement over months.
- **Clinical Records & Orders**: Securely upload, categorize, and share supplementary clinical documents, lab results, and imaging directly to the patient's profile.

### 🤝 Caregiver Dashboard
A proactive oversight tool emphasizing daily support and early intervention.
- **Real-Time Insights & Alerts**: Proactive monitoring of the patient's cognitive trajectories with automated alerts for sudden deviations in cognitive load.
- **Care Network & Tasks**: Coordinate daily caregiving tasks and monitor adherence to the patient's health routines.
- **Unified Communications**: A built-in, secure messaging panel enabling direct, real-time communication between the caregiver, the patient, and the clinical provider.

## 🔬 Core Technologies & Complexities

### The AI & Neuro-Analysis Engine
At the heart of CortexFlow is a dual-layered inference engine. We leverage the **Gemini API** for high-fidelity, real-time audio transcription and complex reasoning schemas. The raw text and pause-map timings are then forwarded to our **FastAPI Python backend**, which computes deterministic linguistic biomarkers, derives cognitive load, and returns a clinically safe, non-diagnostic report payload.

### Interactive 3D Cortex Atlas
We built a custom `Three.js` visualizer that maps the computed biomarker intensities directly onto an interactive 3D brain workspace (MNI152 normalization). Clinicians and patients can rotate, zoom, and visually understand which specific neurological domains are triggering anomalies.

### Real-Time Fluid Aesthetics
The frontend boasts a custom-built, WebGL-powered fluid noise background (`fluid-noise-bg`) and glassmorphism UI components to create a premium, calm, and clinically reassuring user experience.

## 🏗️ Data & Infrastructure

CortexFlow relies on a robust, modern deployment stack designed for global scale, strict data security, and instant edge-delivery.

### Frontend: Vercel + Next.js 16
The entire user interface is deployed on **Vercel**. By utilizing Next.js 16's App Router, React Server Components (RSC), and edge computing, CortexFlow guarantees sub-second interactions, instantaneous page hydration, and a buttery-smooth SPA experience. Vercel acts as our proxy layer, securely routing API requests to our backend while handling global CDN distribution.

### Database & Storage: Supabase + Firebase
- **Supabase (PostgreSQL)**: The backbone of our highly relational data model. Supabase handles the immense complexity of our `provider-patient` and `caregiver-patient` link schemas, access control revocations, massive arrays of structured cognitive reports, and real-time notifications. We also utilize Supabase Storage for encrypted hosting of clinical documents and audio streams.
- **Firebase**: A secure overlay managing robust, multi-tenant authentication.

### Backend Orchestration: Amazon Web Services (AWS)
<p align="left">
  <img src="https://img.shields.io/badge/Amazon_AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS" />
  <img src="https://img.shields.io/badge/Amazon_ECS-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="ECS" />
  <img src="https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white" alt="S3" />
</p>

- **Amazon ECS (Elastic Container Service)**: Our computationally heavy Python/FastAPI microservices are containerized via Docker and orchestrated by ECS. This ensures that when complex cognitive inference operations spike, our backend automatically provisions new containers to handle the load seamlessly.
- **Amazon S3 (Simple Storage Service)**: Used as secure, scalable secondary storage for archiving deep-system artifacts and heavy reporting assets.

## 🛠 Complete Technology Stack

- **Frontend Application**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Data Visualization**: Recharts, Three.js (WebGL)
- **Backend Services**: Python 3.11+, FastAPI, Pydantic, Uvicorn
- **AI / LLM Layer**: Google Gemini API
- **Database & Object Storage**: Supabase (PostgreSQL), Firebase, Amazon S3
- **Hosting & Orchestration**: Vercel (Frontend Edge), Amazon ECS (Backend Containers)

## 👥 Contributors

This complex architecture and ecosystem were designed and engineered by:
- **Manika Kutiyal**
- **Aditya Verma**

---
*Note: The insights generated by CortexFlow are explicitly non-diagnostic and are intended strictly for clinical screening, workflow enhancement, and educational demonstration.*
