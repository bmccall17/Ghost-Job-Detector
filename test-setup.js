#!/usr/bin/env node

/**
 * Test Setup Script for Ghost Job Detector Dashboard
 * 
 * This script performs basic functionality tests to ensure
 * the dashboard is working correctly.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🚀 Ghost Job Detector Dashboard - Test Setup\n')

// Test 1: Check if all required files exist
console.log('📁 Checking project structure...')

const requiredFiles = [
  'package.json',
  'src/App.tsx',
  'src/features/detection/JobAnalysisDashboard.tsx',
  'src/features/detection/AnalysisHistory.tsx',
  'src/stores/analysisStore.ts',
  'src/services/analysisService.ts',
  'src/components/GhostJobBadge.tsx',
  'src/components/FileUpload.tsx',
  'src/components/AnalysisResultsTable.tsx',
  'tailwind.config.js',
  'vite.config.ts',
  'tsconfig.json'
]

let missingFiles = []

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`  ✅ ${file}`)
  } else {
    console.log(`  ❌ ${file} - MISSING`)
    missingFiles.push(file)
  }
})

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing ${missingFiles.length} required files. Please check the installation.`)
  process.exit(1)
}

// Test 2: Check package.json dependencies
console.log('\n📦 Checking dependencies...')

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const requiredDeps = [
  'react',
  'react-dom',
  'zustand',
  'react-hook-form',
  'zod',
  'lucide-react'
]

const requiredDevDeps = [
  'typescript',
  'vite',
  'tailwindcss',
  '@types/react'
]

requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep}`)
  } else {
    console.log(`  ❌ ${dep} - MISSING`)
  }
})

requiredDevDeps.forEach(dep => {
  if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
    console.log(`  ✅ ${dep} (dev)`)
  } else {
    console.log(`  ❌ ${dep} (dev) - MISSING`)
  }
})

// Test 3: Check environment setup
console.log('\n🔧 Checking environment setup...')

if (fs.existsSync('.env.local')) {
  console.log('  ✅ .env.local exists')
} else if (fs.existsSync('.env.local.example')) {
  console.log('  ⚠️  .env.local.example exists, but .env.local is missing')
  console.log('     Run: cp .env.local.example .env.local')
} else {
  console.log('  ❌ No environment files found')
}

// Test 4: Check if node_modules exists
console.log('\n📚 Checking installation...')

if (fs.existsSync('node_modules')) {
  console.log('  ✅ node_modules exists')
  
  // Check if key packages are installed
  const keyPackages = ['react', 'zustand', 'tailwindcss']
  keyPackages.forEach(pkg => {
    if (fs.existsSync(`node_modules/${pkg}`)) {
      console.log(`  ✅ ${pkg} installed`)
    } else {
      console.log(`  ❌ ${pkg} not installed`)
    }
  })
} else {
  console.log('  ❌ node_modules not found')
  console.log('     Run: npm install')
}

// Test 5: Validate TypeScript configuration
console.log('\n🔍 Validating TypeScript configuration...')

try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
  
  if (tsConfig.compilerOptions) {
    console.log('  ✅ TypeScript configuration looks valid')
    
    if (tsConfig.compilerOptions.paths && tsConfig.compilerOptions.paths['@/*']) {
      console.log('  ✅ Path aliases configured')
    } else {
      console.log('  ⚠️  Path aliases not configured')
    }
  } else {
    console.log('  ❌ Invalid TypeScript configuration')
  }
} catch (error) {
  console.log('  ❌ Failed to parse tsconfig.json')
}

console.log('\n🎯 Test Results Summary:')
console.log('================================')

if (missingFiles.length === 0) {
  console.log('✅ All required files present')
  console.log('✅ Project structure is correct')
  console.log('\n🚀 Ready to run!')
  console.log('\nNext steps:')
  console.log('1. npm install (if not done)')
  console.log('2. npm run dev')
  console.log('3. Open http://localhost:5173')
  console.log('\n💡 Test the dashboard by:')
  console.log('   • Analyzing a LinkedIn job URL')
  console.log('   • Uploading a CSV file')
  console.log('   • Checking the analysis history')
} else {
  console.log('❌ Some issues found - please fix before running')
}

console.log('\n📋 Manual Testing Checklist:')
console.log('□ Individual job analysis works')
console.log('□ Form validation prevents invalid URLs')
console.log('□ CSV upload accepts files')
console.log('□ Results display correctly')
console.log('□ History page shows past analyses')
console.log('□ Export buttons are functional')
console.log('□ Responsive design works on mobile')
console.log('□ No console errors in browser')

console.log('\n🔗 Useful commands:')
console.log('npm run dev      - Start development server')
console.log('npm run build    - Build for production')
console.log('npm run typecheck - Check TypeScript')
console.log('npm run lint     - Check code quality')

console.log('\n✨ Happy testing!')