#!/usr/bin/env node

/**
 * Pre-Commit Health Check Script
 * 
 * Automatically detects common error patterns and issues before committing code.
 * Run with: node scripts/pre-commit-health-check.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class HealthChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(level, message, file = null, line = null) {
    const entry = { message, file, line };
    switch (level) {
      case 'error':
        this.errors.push(entry);
        break;
      case 'warning':
        this.warnings.push(entry);
        break;
      case 'info':
        this.info.push(entry);
        break;
    }
  }

  /**
   * Check for unsafe error.message access patterns
   */
  checkErrorHandling() {
    console.log('🔍 Checking error handling patterns...');
    
    const files = this.findFiles(['src/**/*.ts', 'src/**/*.tsx'], ['.d.ts']);
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for unsafe error.message access
        if (line.includes('error.message') && !line.includes('instanceof Error')) {
          // Check if this line is in a catch block context
          const contextLines = lines.slice(Math.max(0, index - 5), index + 1);
          const inCatchBlock = contextLines.some(l => l.includes('catch') && l.includes('error'));
          
          if (inCatchBlock) {
            this.log('error', 
              'Unsafe error.message access - use type guard: error instanceof Error ? error.message : "Unknown error"',
              filePath, lineNum);
          }
        }
        
        // Check for missing type guards in error handling
        if (line.match(/catch\s*\(\s*\w+\s*\)\s*{/) && !line.includes('Error')) {
          const nextFewLines = lines.slice(index, index + 10);
          const hasTypeGuard = nextFewLines.some(l => l.includes('instanceof Error'));
          
          if (!hasTypeGuard) {
            this.log('warning', 
              'Catch block without type guard - consider checking error instanceof Error',
              filePath, lineNum);
          }
        }
      });
    });
  }

  /**
   * Check for external API calls without timeouts
   */
  checkExternalAPICalls() {
    console.log('🌐 Checking external API calls...');
    
    const files = this.findFiles(['src/**/*.ts', 'src/**/*.tsx', 'api/**/*.js']);
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for external API calls
        if (line.includes('fetch(') && line.includes('allorigins.win')) {
          // Check if timeout is implemented
          const contextLines = lines.slice(index, index + 10);
          const hasTimeout = contextLines.some(l => 
            l.includes('timeout') || 
            l.includes('AbortController') || 
            l.includes('signal:')
          );
          
          if (!hasTimeout) {
            this.log('warning', 
              'External API call without timeout - add AbortController with timeout',
              filePath, lineNum);
          }
        }
        
        // Check for other external APIs without timeout
        if (line.match(/fetch\(['"`]https?:\/\/[^'"`]*['"`]\)/) && !line.includes('localhost')) {
          const contextLines = lines.slice(index, index + 5);
          const hasTimeout = contextLines.some(l => l.includes('timeout') || l.includes('signal:'));
          
          if (!hasTimeout) {
            this.log('info', 
              'External API call detected - consider adding timeout for reliability',
              filePath, lineNum);
          }
        }
      });
    });
  }

  /**
   * Check for outdated API endpoint references
   */
  checkAPIEndpoints() {
    console.log('📡 Checking API endpoint references...');
    
    const files = this.findFiles(['src/**/*.ts', 'src/**/*.tsx']);
    
    // Known consolidated/removed endpoints
    const outdatedEndpoints = [
      '/api/learning/ingest-failure', // consolidated into parse-preview
      '/api/history', // renamed to analysis-history
      '/api/simple-test', // removed
      '/api/test-connection' // removed
    ];
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        outdatedEndpoints.forEach(endpoint => {
          if (line.includes(endpoint)) {
            this.log('error', 
              `Outdated API endpoint reference: ${endpoint}`,
              filePath, lineNum);
          }
        });
      });
    });
  }

  /**
   * Check Vercel function count
   */
  checkFunctionCount() {
    console.log('📦 Checking Vercel function count...');
    
    try {
      const result = execSync('node scripts/verify-function-count.js', { 
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.includes('12/12') || result.includes('13/12')) {
        this.log('error', 'Vercel function limit reached or exceeded - consolidate functions');
      } else if (result.includes('11/12')) {
        this.log('warning', 'Only 1 Vercel function slot remaining');
      } else {
        this.log('info', 'Vercel function count within limits');
      }
    } catch (error) {
      this.log('warning', 'Could not verify function count - script may be missing');
    }
  }

  /**
   * Check TypeScript compilation
   */
  checkTypeScript() {
    console.log('🔧 Checking TypeScript compilation...');
    
    try {
      execSync('npm run typecheck', { 
        cwd: projectRoot,
        stdio: 'pipe'
      });
      this.log('info', 'TypeScript compilation successful');
    } catch (error) {
      this.log('error', 'TypeScript compilation failed - run npm run typecheck for details');
    }
  }

  /**
   * Check for database field references after schema changes
   */
  checkDatabaseFieldReferences() {
    console.log('🗄️ Checking for stale database field references...');
    
    const files = this.findFiles(['src/**/*.ts', 'src/**/*.tsx', 'api/**/*.js']);
    
    // Fields that were removed in recent schema changes
    const removedFields = [
      'ghostProbability', // replaced with score
      'analysisId', // redundant with id
      'algorithmAssessment', // removed JSON field
      'riskFactorsAnalysis', // removed JSON field
      'analysisDetails' // removed JSON field
    ];
    
    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        removedFields.forEach(field => {
          if (line.includes(field) && !line.includes('// REMOVED:') && !line.includes('PHASE')) {
            this.log('warning', 
              `Reference to removed database field: ${field}`,
              filePath, lineNum);
          }
        });
      });
    });
  }

  /**
   * Helper method to find files matching patterns
   */
  findFiles(patterns, excludePatterns = []) {
    const files = [];
    
    const walkDir = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.') && !item.name.includes('node_modules')) {
          walkDir(fullPath);
        } else if (item.isFile()) {
          const relativePath = path.relative(projectRoot, fullPath);
          
          const matchesPattern = patterns.some(pattern => {
            // Convert glob pattern to regex
            let regexPattern = pattern
              .replace(/\*\*/g, '.*')
              .replace(/\*/g, '[^/]*')
              .replace(/\./g, '\\.');
            const regex = new RegExp(regexPattern);
            return regex.test(relativePath);
          });
          
          const isExcluded = excludePatterns.some(pattern => relativePath.includes(pattern));
          
          if (matchesPattern && !isExcluded) {
            files.push(fullPath);
          }
        }
      });
    };
    
    walkDir(projectRoot);
    return files;
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    console.log('🏥 Starting Ghost Job Detector Health Check...\n');
    
    this.checkTypeScript();
    this.checkErrorHandling();
    this.checkExternalAPICalls();
    this.checkAPIEndpoints();
    this.checkFunctionCount();
    this.checkDatabaseFieldReferences();
    
    console.log('\n📊 Health Check Results:\n');
    
    // Display results
    if (this.errors.length > 0) {
      console.log('🚨 ERRORS (must fix before committing):');
      this.errors.forEach(error => {
        const location = error.file ? `${error.file}:${error.line || '?'}` : '';
        console.log(`   ❌ ${error.message}${location ? ` (${location})` : ''}`);
      });
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS (should fix):');
      this.warnings.forEach(warning => {
        const location = warning.file ? `${warning.file}:${warning.line || '?'}` : '';
        console.log(`   🟡 ${warning.message}${location ? ` (${location})` : ''}`);
      });
      console.log('');
    }
    
    if (this.info.length > 0) {
      console.log('ℹ️  INFO (for awareness):');
      this.info.forEach(info => {
        const location = info.file ? `${info.file}:${info.line || '?'}` : '';
        console.log(`   🔵 ${info.message}${location ? ` (${location})` : ''}`);
      });
      console.log('');
    }
    
    // Summary
    const totalIssues = this.errors.length + this.warnings.length;
    
    if (this.errors.length > 0) {
      console.log(`❌ Health check FAILED: ${this.errors.length} error(s) must be fixed before committing`);
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(`⚠️  Health check PASSED with warnings: ${this.warnings.length} item(s) should be addressed`);
      process.exit(0);
    } else {
      console.log('✅ Health check PASSED: No issues found');
      process.exit(0);
    }
  }
}

// Run the health check
const checker = new HealthChecker();
checker.runAllChecks().catch(console.error);