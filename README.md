# Ghost Job Detector Dashboard

A React-based web dashboard for detecting fake job postings with 95%+ accuracy using machine learning. This dashboard provides both individual job analysis and bulk CSV processing capabilities.

## 🎯 Features

- **Individual Job Analysis**: Analyze LinkedIn job URLs in real-time
- **Bulk CSV Upload**: Process multiple jobs via drag-and-drop CSV upload
- **Analysis History**: Track all previous analyses with timestamps
- **Export Functionality**: Export results to CSV or PDF formats
- **Risk Visualization**: Color-coded badges (Green/Yellow/Red) for ghost job probability
- **Statistics Dashboard**: View analysis trends and risk distribution
- **Responsive Design**: Works on desktop and mobile devices

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Jest + Testing Library

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Ghost-Job-Detector.git
cd Ghost-Job-Detector
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your API configuration:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the dashboard.

## 📚 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run test suite |

## 🏗 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── AnalysisResultsTable.tsx
│   ├── FileUpload.tsx
│   └── GhostJobBadge.tsx
├── features/            # Feature-based modules
│   └── detection/
│       ├── JobAnalysisDashboard.tsx
│       └── AnalysisHistory.tsx
├── hooks/               # Custom React hooks
├── services/            # API and external services
│   └── analysisService.ts
├── stores/              # Zustand state stores
│   └── analysisStore.ts
├── types/               # TypeScript type definitions
│   └── index.ts
├── utils/               # Utility functions
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## 🎯 Usage Guide

### Individual Job Analysis

1. Click the "Single Job Analysis" tab
2. Paste a LinkedIn job URL
3. Click "Analyze Job"
4. View results with risk assessment and key factors

### Bulk Analysis

1. Click the "Bulk Analysis" tab
2. Upload a CSV file with job URLs
3. Monitor processing progress
4. Export results when complete

### CSV Format for Bulk Upload

```csv
job_url,title,company
https://linkedin.com/jobs/view/123,Software Engineer,Tech Corp
https://linkedin.com/jobs/view/456,Data Scientist,AI Startup
```

## 🔧 API Integration

The dashboard uses a REST API for job analysis. Currently configured with mock responses for development.

### Expected API Endpoints

- `POST /api/v1/detection/analyze` - Single job analysis
- `POST /api/v1/detection/bulk-analyze` - Bulk CSV upload
- `GET /api/v1/detection/bulk-analyze/{id}` - Check bulk job status
- `POST /api/v1/detection/export` - Export analysis results

### Mock Data Structure

```typescript
interface AnalysisResult {
  id: string
  ghostProbability: number // 0-1 range
  confidence: number // 0-1 range
  factors: Array<{
    factor: string
    weight: number
    description: string
  }>
  metadata: {
    processingTime: number
    modelVersion: string
  }
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Manual Testing Checklist

- [ ] Individual job analysis with valid LinkedIn URL
- [ ] Form validation with invalid URLs
- [ ] CSV file upload (drag & drop)
- [ ] Analysis results display correctly
- [ ] Export functionality works
- [ ] History page shows past analyses
- [ ] Statistics update correctly
- [ ] Responsive design on mobile

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The `dist/` folder contains the production-ready files.

### Environment Configuration

For production deployment, set these environment variables:

```env
VITE_API_BASE_URL=https://api.ghostjobdetector.com/api/v1
```

## 🔍 Architecture Decisions

### State Management
- **Zustand** chosen for simplicity and TypeScript support
- Single store for analysis state with clear actions
- Persistent storage for analysis history

### Component Design
- Feature-based folder structure
- Components under 200 lines following CLAUDE.md guidelines
- TypeScript interfaces for all props
- Tailwind CSS for consistent styling

### Performance Optimizations
- Lazy loading for heavy components
- Memoized expensive calculations
- Optimized bundle size with Vite

## 📈 Performance Requirements

As per PRD requirements:
- **Analysis Response Time**: < 2 seconds per job
- **Bundle Size**: < 500KB gzipped
- **Accuracy Target**: 95%+ ghost job detection
- **Concurrent Users**: Support for 10,000+ active users

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript Errors**
```bash
# Run type checking
npm run typecheck
```

**Git Line Ending Issues (Windows)**
```bash
git config core.autocrlf false
```

### Development Tips

1. Use React DevTools for component inspection
2. Check Network tab for API call debugging
3. Use TypeScript strict mode for better error catching
4. Follow ESLint rules for consistent code style

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Documentation

- [Product Requirements Document](GhostJobDetector_PRD.txt)
- [Development Guidelines](CLAUDE.md)
- [API Documentation](docs/api.md) *(Coming Soon)*
- [Deployment Guide](docs/deployment.md) *(Coming Soon)*

---

**Built with ❤️ for job seekers everywhere**