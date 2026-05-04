## Project

TV Series Bingo


## Technology Stack

# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- Python 3.11 - Backend API and services (`backend/`)
- TypeScript 6.0.2 - Frontend application (`frontend/`)
- JavaScript - Vite build tooling

**Secondary:**
- HTML5 - Frontend markup
- CSS3 - Frontend styling

## Runtime

**Environment:**
- Python 3.11-slim (Docker production image)
- Node.js 20-alpine (Docker build stage for frontend)
- Browser runtime (React 19.2.4 frontend)

**Package Manager:**
- pip (Python) - Manages backend dependencies
  - Lockfile: No lock file tracked; uses pinned versions in `backend/requirements.txt`
- npm (Node.js) - Manages frontend dependencies
  - Lockfile: `frontend/package-lock.json` present

## Frameworks

**Core:**
- FastAPI 0.115.0 - Backend REST API framework
- React 19.2.4 - Frontend UI library
- Vite 8.0.4 - Frontend build tool and dev server

**Testing:**
- Not detected

**Build/Dev:**
- TypeScript (tsc) - Frontend type checking and compilation
- ESLint 9.39.4 - Fr

