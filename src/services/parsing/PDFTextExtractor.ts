import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api'

// Set up PDF.js worker - Vite-compatible configuration
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export interface PDFTextContent {
  fullText: string
  pageTexts: string[]
  metadata: {
    numPages: number
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  processingTimeMs: number
}

export interface PDFExtractionOptions {
  includeHiddenText?: boolean
  preserveSpacing?: boolean
  onProgress?: (pageNumber: number, totalPages: number) => void
}

export class PDFTextExtractor {
  private static instance: PDFTextExtractor
  
  static getInstance(): PDFTextExtractor {
    if (!PDFTextExtractor.instance) {
      PDFTextExtractor.instance = new PDFTextExtractor()
    }
    return PDFTextExtractor.instance
  }

  async extractText(
    file: File, 
    options: PDFExtractionOptions = {}
  ): Promise<PDFTextContent> {
    const startTime = Date.now()
    
    try {
      console.log('🔄 Starting PDF.js text extraction...', {
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        workerSrc: GlobalWorkerOptions.workerSrc
      })
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      console.log('📄 File converted to ArrayBuffer:', arrayBuffer.byteLength, 'bytes')
      
      // Load PDF document
      const pdf = await getDocument({
        data: arrayBuffer,
        verbosity: 1 // Increase verbosity for debugging
      }).promise
      
      console.log('✅ PDF document loaded successfully:', {
        pages: pdf.numPages,
        fingerprint: pdf.fingerprints?.[0]
      })
      
      // Extract metadata
      const metadata = await this.extractMetadata(pdf)
      
      // Extract text from all pages
      const pageTexts: string[] = []
      const totalPages = pdf.numPages
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        options.onProgress?.(pageNum, totalPages)
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Process text items into readable text
        const pageText = this.processTextContent(textContent, options)
        pageTexts.push(pageText)
        
        // Clean up page resources
        page.cleanup()
      }
      
      // Combine all pages
      const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n')
      
      // Clean up PDF resources
      pdf.cleanup()
      
      const result = {
        fullText,
        pageTexts,
        metadata: {
          ...metadata,
          numPages: totalPages
        },
        processingTimeMs: Date.now() - startTime
      }
      
      console.log('🎉 PDF text extraction completed successfully:', {
        fileName: file.name,
        pages: totalPages,
        textLength: fullText.length,
        processingTime: result.processingTimeMs
      })
      
      return result
    } catch (error) {
      const processingTime = Date.now() - startTime
      
      console.error('🚨 PDF.js text extraction failed:', {
        fileName: file.name,
        fileSize: file.size,
        processingTime,
        workerSrc: GlobalWorkerOptions.workerSrc,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      })
      
      // Specific error type detection
      if (error instanceof Error) {
        if (error.message.includes('worker')) {
          console.error('❌ PDF.js Worker Loading Error - Check worker configuration')
        } else if (error.message.includes('Invalid PDF')) {
          console.error('❌ PDF File Format Error - File may be corrupted or encrypted')  
        } else if (error.message.includes('Range')) {
          console.error('❌ PDF Memory Error - File may be too large')
        }
      }
      
      throw new Error(`PDF parsing failed after ${processingTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async extractMetadata(pdf: PDFDocumentProxy): Promise<Partial<PDFTextContent['metadata']>> {
    try {
      const metadata = await pdf.getMetadata()
      const info = metadata.info as any // Type assertion for PDF metadata
      
      return {
        title: info?.Title || undefined,
        author: info?.Author || undefined,
        subject: info?.Subject || undefined,
        creator: info?.Creator || undefined,
        producer: info?.Producer || undefined,
        creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info?.ModDate ? new Date(info.ModDate) : undefined
      }
    } catch (error) {
      console.warn('Could not extract PDF metadata:', error)
      return {}
    }
  }

  private processTextContent(textContent: any, options: PDFExtractionOptions): string {
    const textItems = textContent.items as TextItem[]
    
    if (!textItems || textItems.length === 0) {
      return ''
    }
    
    let text = ''
    let lastY = -1
    let lastX = -1
    
    for (const item of textItems) {
      if (!item.str) continue
      
      // Skip hidden text unless explicitly requested
      if (!options.includeHiddenText && this.isHiddenText(item)) {
        continue
      }
      
      // Add line breaks for significant Y position changes
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
        text += '\n'
        lastX = -1
      }
      
      // Add spacing for significant X position changes on same line
      if (options.preserveSpacing && lastX !== -1 && 
          Math.abs(item.transform[4] - lastX) > item.width * 2) {
        text += ' '
      }
      
      text += item.str
      
      // Update position tracking
      lastY = item.transform[5]
      lastX = item.transform[4] + item.width
      
      // Add space after text item if it doesn't end with whitespace
      if (!item.str.endsWith(' ') && !item.str.endsWith('\n')) {
        text += ' '
      }
    }
    
    // Clean up extra whitespace
    return text.replace(/\s+/g, ' ').trim()
  }
  
  private isHiddenText(item: TextItem): boolean {
    // Text is considered hidden if it's very small or transparent
    const fontSize = Math.abs(item.transform[0])
    return fontSize < 1
  }

  async extractTextFromPages(
    file: File, 
    pageNumbers: number[]
  ): Promise<{ [pageNumber: number]: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await getDocument({ data: arrayBuffer, verbosity: 0 }).promise
      
      const result: { [pageNumber: number]: string } = {}
      
      for (const pageNum of pageNumbers) {
        if (pageNum < 1 || pageNum > pdf.numPages) {
          console.warn(`Page ${pageNum} is out of range (1-${pdf.numPages})`)
          continue
        }
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        result[pageNum] = this.processTextContent(textContent, { preserveSpacing: true })
        page.cleanup()
      }
      
      pdf.cleanup()
      return result
    } catch (error) {
      console.error('Failed to extract text from specific pages:', error)
      throw error
    }
  }
}