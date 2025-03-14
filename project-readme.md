# DynamicScout AI

An intelligent web scraping platform with AI capabilities for automated data extraction and analysis.

![DynamicScout AI Logo](./frontend/public/logo192.png)

## Overview

DynamicScout AI is a sophisticated, containerized web scraping platform that empowers users to collect structured data from virtually any website through an intuitive interface and AI-driven optimization. The platform features intelligent website analysis, adaptive scraping strategies, and real-time progress tracking.

### Key Features

- **Interactive Learning Mode**: Browser extension that records user navigation and selection patterns with AI analysis
- **Intelligent Scraping Strategies**: AI-powered website evaluation for optimal scraping approach
- **Advanced Web Handling**: Multiple proxy support with rotation capabilities and CAPTCHA handling
- **Structured Data Extraction**: Export in multiple formats (CSV, JSON, Excel)
- **Dynamic Schema Generation**: Supabase integration with on-demand SQL schema generation
- **LLM Integration**: OpenRouter.ai integration with ability to select different AI models

## System Architecture

DynamicScout AI is built with a modern, containerized architecture consisting of the following components:

1. **Backend API** (Node.js/Express)
   - RESTful API for job management, data access, and system control
   - Authentication and authorization management
   - LLM integration via OpenRouter

2. **Frontend Dashboard** (React)
   - Modern UI with responsive design
   - Real-time job monitoring and visualization
   - Project and job management interface

3. **Browser Extension** (Chrome/Firefox)
   - Records user interactions for training
   - Interactive element selection
   - Navigation pattern learning

4. **Scraper Engine** (Python)
   - Multiple scraping strategies (requests, headless browser)
   - CAPTCHA handling and resolution
   - Proxy rotation and management

5. **AI Analysis Module**
   - Website structure evaluation
   - Optimal scraping path determination
   - Adaptive learning from successful/failed attempts

6. **Database Layer** (Supabase/PostgreSQL)
   - Structured data storage
   - Dynamic schema generation
   - Row-level security

7. **Proxy Management Service**
   - Proxy health monitoring
   - Rotation and fallback mechanisms
   - Geographic distribution options

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.10+ (for development)
- Supabase account
- OpenRouter.ai API key

### Installation

#### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/dynamicscout-ai.git
   cd dynamicscout-ai
   ```

2. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Build and start the containers:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:3000

#### Manual Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/dynamicscout-ai.git
   cd dynamicscout-ai
   ```

2. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

5. Install scraper dependencies:
   ```bash
   cd scraper
   pip install -r requirements.txt
   ```

6. Start the services:
   - Backend: `cd backend && npm start`
   - Frontend: `cd frontend && npm start`
   - Scraper: `cd scraper && python main.py`

### Browser Extension Installation

1. Go to the Extensions page in your browser (Chrome: `chrome://extensions`, Firefox: `about:addons`)
2. Enable Developer Mode
3. Click "Load Unpacked" (Chrome) or "Load Temporary Add-on" (Firefox)
4. Select the `extension` directory from the project

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following configuration:

```
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# LLM Configuration
OPENROUTER_API_KEY=your_openrouter_key
DEFAULT_MODEL=anthropic/claude-3-opus

# Proxy Configuration (optional)
USE_PROXIES=true
PROXY_SERVICE=luminati
LUMINATI_USERNAME=your_luminati_username
LUMINATI_PASSWORD=your_luminati_password
LUMINATI_ZONE=your_luminati_zone

# Other Settings
MAX_CONCURRENT_JOBS=5
```

### Supabase Setup

1. Create a Supabase project
2. Run the initialization SQL script located in `deployment/init_db.sql`
3. Copy your Supabase URL and API key to the `.env` file

### LLM Provider Setup

1. Create an account on OpenRouter.ai
2. Generate an API key
3. Add the API key to your `.env` file

## Usage

### Creating a Project

1. Log in to the DynamicScout AI dashboard
2. Click "New Project" and enter a name and description
3. Click "Create Project"

### Recording a Web Interaction

1. Install the browser extension
2. Navigate to the target website
3. Click the extension icon and select "Start Recording"
4. Interact with the website as you would like the scraper to
5. Click "Stop Recording" when finished
6. Name your recording and click "Upload & Analyze"

### Creating a Scraping Job

1. Select a project from the dashboard
2. Click "New Job"
3. Choose a recorded interaction or manually configure the job
4. Set scheduling options and proxy settings
5. Click "Create Job" to begin scraping

### Viewing Results

1. From the dashboard, select a job
2. Click "View Data" to see extracted information
3. Use the export options to download in CSV, JSON, or Excel format

## Deployment

### Docker Deployment

Use the provided Docker Compose configuration to deploy in production:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Plesk Deployment

Follow the detailed instructions in [Plesk Deployment Guide](./deployment/plesk_setup.md) for deploying on a Plesk-managed Ubuntu server.

## Development

### Project Structure

```
DynamicScout-AI/
├── .env.example                 # Template for environment variables
├── README.md                    # Project documentation
├── docker-compose.yml           # Multi-container Docker configuration
├── Dockerfile                   # Container build instructions
├── deployment/                  # Deployment scripts and guides
├── backend/                     # Node.js Express API backend
├── frontend/                    # React dashboard
├── scraper/                     # Python-based scraper engine
└── extension/                   # Browser extension
```

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `npm test` (backend/frontend) or `pytest` (scraper)
4. Submit a pull request

## API Documentation

### Authentication

```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

### Projects

```
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id
```

### Jobs

```
GET /api/jobs
POST /api/jobs
GET /api/jobs/:id
PUT /api/jobs/:id
DELETE /api/jobs/:id
GET /api/jobs/:id/data
```

### Recordings

```
GET /api/recordings
POST /api/recordings
GET /api/recordings/:id
DELETE /api/recordings/:id
POST /api/recordings/:id/analyze
```

See the [API Documentation](./docs/api.md) for complete details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- OpenRouter.ai for LLM integration
- Supabase for database services
- Puppeteer and Playwright for headless browser capabilities
- React and shadcn/ui for frontend components
