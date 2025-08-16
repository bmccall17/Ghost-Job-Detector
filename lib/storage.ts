// Ghost Job Detector - Blob Storage System
// Database: ghost-job-blob

import { put, del, head } from '@vercel/blob';
import crypto from 'crypto';

// Storage utility class
export class BlobStorage {
  // Store uploaded PDF
  static async storePDF(file: File, sourceUrl?: string): Promise<{
    url: string;
    pathname: string;
    contentType: string;
    size: number;
  }> {
    const filename = `pdfs/${Date.now()}-${crypto.randomUUID()}.pdf`;
    
    const blob = await put(filename, file, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: 'application/pdf',
      size: file.size,
    };
  }

  // Store HTML snapshot
  static async storeHTML(content: string, sourceUrl: string): Promise<{
    url: string;
    pathname: string;
    contentType: string;
    size: number;
  }> {
    const urlHash = crypto.createHash('sha256').update(sourceUrl).digest('hex').substring(0, 16);
    const filename = `html/${Date.now()}-${urlHash}.html`;
    
    const blob = await put(filename, content, {
      access: 'public',
      contentType: 'text/html',
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: 'text/html',
      size: Buffer.from(content, 'utf8').length,
    };
  }

  // Store extracted text content
  static async storeText(content: string, originalUrl: string): Promise<{
    url: string;
    pathname: string;
    contentType: string;
    size: number;
  }> {
    const urlHash = crypto.createHash('sha256').update(originalUrl).digest('hex').substring(0, 16);
    const filename = `text/${Date.now()}-${urlHash}.txt`;
    
    const blob = await put(filename, content, {
      access: 'public',
      contentType: 'text/plain',
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: 'text/plain',
      size: Buffer.from(content, 'utf8').length,
    };
  }

  // Get file metadata
  static async getMetadata(url: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  } | null> {
    try {
      const result = await head(url);
      return {
        size: result.size,
        contentType: result.contentType,
        lastModified: new Date(result.uploadedAt),
      };
    } catch (error) {
      console.error('Failed to get blob metadata:', error);
      return null;
    }
  }

  // Delete stored file
  static async deleteFile(url: string): Promise<boolean> {
    try {
      await del(url);
      return true;
    } catch (error) {
      console.error('Failed to delete blob:', error);
      return false;
    }
  }

  // Generate content hash for deduplication
  static generateContentHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Validate file types
  static validatePDF(file: File): { valid: boolean; error?: string } {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, error: 'File size must be less than 10MB' };
    }
    
    return { valid: true };
  }

  // Storage path helpers
  static getPDFPath(timestamp: number, uuid: string): string {
    return `pdfs/${timestamp}-${uuid}.pdf`;
  }

  static getHTMLPath(timestamp: number, urlHash: string): string {
    return `html/${timestamp}-${urlHash}.html`;
  }

  static getTextPath(timestamp: number, urlHash: string): string {
    return `text/${timestamp}-${urlHash}.txt`;
  }
}