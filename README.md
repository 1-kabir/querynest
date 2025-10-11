# QueryNest — AI Knowledge & Insight Hub

> Instantly search, understand, and connect all your knowledge — personal or professional — powered by AI.

---

## **Overview**

Knowledge is scattered across files, notes, and apps, making it hard to retrieve or analyze. **QueryNest** (a.k.a. MindMesh) is an AI-powered knowledge hub that allows users to:

- Upload documents (PDF, DOCX, TXT)
- Ask questions in natural language
- Receive concise, contextual answers
- Gain insights across multiple documents

It combines **Elastic Cloud** for hybrid search with **Google Vertex AI / Gemini** for AI-powered responses, wrapped in a polished **Next.js + Tailwind + shadcn UI** frontend.

---

## **Features**

### MVP Features
- **File Upload & Storage:** Drag-and-drop document upload with Firebase + Cloudinary backend
- **Hybrid Search:** Keyword + semantic vector search with Elastic Cloud
- **AI Chat:** Context-aware answers using AI with search results as context
- **Insight Mode:** Detect trends, patterns, or recurring themes across documents
- **Clean UI:** Dashboard for files, search bar, and chat interface

### Future / Optional Features
- Integrate external sources: Notion, Slack, Google Docs
- Team collaboration: shared insights, tagging, boards
- Analytics dashboard for usage and queries
- Paid SaaS model with unlimited storage and enterprise integrations

---

## **Tech Stack**

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript, TailwindCSS, shadcn UI |
| Backend | Node.js / Next.js API routes |
| Database / Auth | Firebase |
| File Storage | Cloudinary |
| Search Engine | Elastic Cloud (hybrid keyword + vector search) |
| AI / NLP | Google Cloud Vertex AI / Gemini |
| Hosting | VPS / Cloud hosting |

---

## **Architecture**

1. User uploads documents → stored in Cloudinary → text extracted → Elastic index updated.  
2. User sends query → Elastic search retrieves relevant docs → context passed to Gemini → AI generates answer → frontend displays results.  
3. Insight Mode aggregates patterns/trends across documents.

---

## **Getting Started**

### Prerequisites
- Node.js v18+
- Firebase project setup
- Elastic Cloud instance
- Google Vertex AI / Gemini credentials
- Cloudinary account

### Installation
```bash
git clone https://github.com/1-kabir/querynest.git
cd querynest
npm install
```