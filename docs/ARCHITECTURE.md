# Ghost Job Detector - System Architecture

**Current Version**: v0.1.8 (Latest)  
**Status**: ✅ Production Deployed  
**Updated**: December 15, 2024

---

## 📋 Architecture Documentation Status

This document serves as the **architecture index** for the Ghost Job Detector system. The current production architecture is maintained in the versioned documentation below.

### 🔗 Current Architecture Documentation

**▶ [ARCHITECTURE_v0.1.8.md](./ARCHITECTURE_v0.1.8.md)** - **PRIMARY REFERENCE**
- Production-deployed architecture (v0.1.8)
- Complete WebLLM integration specifications  
- Database optimization details (Phase 2)
- API endpoint architecture
- Component organization patterns

**▶ [SYSTEM_ARCHITECTURE_DIAGRAMS.md](./SYSTEM_ARCHITECTURE_DIAGRAMS.md)** - **VISUAL REFERENCE**
- System overview diagrams with Mermaid charts
- WebLLM processing flow visualization
- Database architecture (ERD) with optimizations
- Deployment pipeline and monitoring architecture
- User interface flow and performance monitoring

### 📈 Architecture Evolution

| Version | Date | Key Changes |
|---------|------|-------------|
| **v0.1.8** | Nov 28, 2024 | WebLLM integration, database optimization, learning system |
| v0.1.7 | Nov 15, 2024 | News & Impact features, UI/UX overhaul |
| v0.1.6 | Nov 8, 2024 | Critical API fixes, database writing resolution |
| v0.1.5 | Nov 1, 2024 | TypeScript fixes, analysis history integration |

### 🏗️ System Overview

The Ghost Job Detector implements a **production-first architecture** with:

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Vercel serverless functions (10/12 used)
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: WebLLM with Llama-3.1-8B-Instruct
- **Learning System**: Real-time parsing correction and improvement

### 📊 Key Architectural Decisions

1. **WebLLM Browser-Based AI**: Client-side processing for privacy and performance
2. **Database Optimization**: JSON consolidation achieved 40-60% storage reduction  
3. **Function Efficiency**: Optimized to 10/12 Vercel functions for cost control
4. **Real-time Learning**: User feedback immediately improves system accuracy

---

## 🔍 Documentation Usage

- **Developers**: Use [ARCHITECTURE_v0.1.8.md](./ARCHITECTURE_v0.1.8.md) for implementation details
- **Operations**: Reference current version for deployment and monitoring
- **Planning**: Consult version history for understanding architectural evolution

---

**Note**: This index is automatically updated when new architecture versions are released. Always refer to the versioned documents for accurate implementation details.