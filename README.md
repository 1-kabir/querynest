# QueryNest — AI Knowledge & Insight Hub

> Instantly search, understand, and connect all your knowledge — personal or professional — powered by AI.

---

## **Overview**

Knowledge is scattered across files, notes, and apps, making it hard to retrieve or analyze. **QueryNest** is an AI-powered knowledge hub that allows users to:

- Upload documents (PDF, DOCX, TXT)
- Ask questions in natural language
- Receive concise, contextual answers
- Gain insights across multiple documents

It combines **Elasticsearch** for hybrid search with **Google Vertex AI / Gemini** for AI-powered responses, wrapped in a polished **Next.js + Tailwind + shadcn UI** frontend.

---

## **Features**

### MVP Features
- **File Upload & Storage:** Drag-and-drop document upload with Supabase backend
- **Hybrid Search:** Keyword + semantic vector search with Elastic Cloud
- **AI Chat:** Context-aware answers using AI with search results as context
- **Clean UI:** Dashboard for files, search bar, and chat interface

---

## **Tech Stack**

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript, TailwindCSS, shadcn UI |
| Backend | Node.js with Express |
| Database / Auth / File Storage | Supabase |
| Search Engine | Elasticsearch |
| AI / NLP | Google Cloud Vertex AI / Gemini |

---

## **Architecture**

1. User uploads documents → stored in Supabase → text extracted → Elastic index updated.  
2. User sends query → Elastic search retrieves relevant docs → context passed to Gemini → AI generates answer → frontend displays results.  

---

## **Getting Started**

### Prerequisites
- Supabase project setup
- Elastic Cloud instance
- Google Vertex AI / Gemini credentials

### Installation
```bash
git clone https://github.com/1-kabir/querynest.git
cd querynest_frontend
npm install
cd ../querynest_backend
npm install
```

### .env Setup

From the main directory execute `cd querynest_frontend` and create a file called .env with the following details using your own credentials:
```
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Elasticsearch
ELASTIC_URL=https://your-elasticsearch-domain.com
ELASTIC_USERNAME=your-elastic-username
ELASTIC_PASSWORD=your-elastic-password
ELASTIC_APIKEY=your-elastic-api-key
ELASTIC_INDEX=your-elastic-index
ELASTIC_NUM_HITS=5
ELASTIC_USE_GROUNDING=true
ES_TOOL_RESPONSE_MAX_BYTES=100000

# Vertex AI / Google Cloud
VERTEX_AI_MODEL=gemini-2.5-flash
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GCP_LOCATION=us-central1
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./gen-lang-client.json

# Demo login
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=demo123

# Backend
BACKEND_API_URL=http://localhost:2110
ALLOWED_API_ORIGINS=domain.com,www.domain.com
```

Then execute `cd ../querynest_backend` and create a file called .env with the following details using your own credentials:
```
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Elasticsearch
ELASTIC_URL=https://your-elasticsearch-domain.com
ELASTIC_USERNAME=your-elastic-username
ELASTIC_PASSWORD=your-elastic-password

# App Configuration
ALLOWED_DOMAINS="http://localhost:2100,https://your-production-app.com"
PORT=2100
```

### Startup

You're almost done! Now to start up the frontend, execute `cd querynest_frontend` and then `npm run dev`

Now open a new terminal and to execute the backend, run `cd querynest_backend` and then `npm start

Have fun! You can access the app at http://localhost:2100

---

## Thank you!
Thank you for the opportunity to work on this hackathon, this was one of my first Devpost hackathons I've taken part in so thank you for this opportunity and good luck to everyone else! 💙