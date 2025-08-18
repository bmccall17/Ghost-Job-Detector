/**
 * Agent Ingest API Endpoint
 * Persists agent validation results and links them to analyses
 */
import { prisma } from '../../lib/db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    console.log('🤖 Agent ingest request:', { 
      url: body?.url, 
      agent: body?.agent,
      hasOutput: !!body?.out 
    });

    // Basic shape validation
    if (!body?.url || !body?.out) {
      console.error('❌ Bad request: missing url or out');
      return res.status(400).json({ 
        ok: false, 
        error: 'bad_request',
        message: 'Missing required fields: url, out' 
      });
    }

    // Generate content hash for idempotency
    const contentSha256 = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    // Check for existing event (idempotency)
    const existing = await prisma.event.findFirst({
      where: { 
        kind: 'agent_validate',
        meta: {
          path: ['contentSha256'],
          equals: contentSha256
        }
      }
    });

    if (existing) {
      console.log('🔄 Duplicate agent validation detected, skipping');
      return res.status(200).json({ 
        ok: true, 
        eventId: existing.id, 
        dedup: true 
      });
    }

    // Find source and job listing by URL
    let source = null;
    let job = null;

    try {
      source = await prisma.source.findFirst({ 
        where: { url: body.url } 
      });

      if (source) {
        job = await prisma.jobListing.findFirst({ 
          where: { sourceId: source.id } 
        });
      }

      console.log('🔍 Found source:', source?.id, 'job:', job?.id);
    } catch (dbError) {
      console.warn('⚠️ Database lookup failed, continuing without job link:', dbError.message);
    }

    // Create event record
    const eventData = {
      kind: 'agent_validate',
      refTable: job ? 'job_listings' : null,
      refId: job?.id ?? null,
      meta: {
        ...body.out,
        agent: body.agent || 'webllm',
        url: body.url,
        contentSha256,
        htmlSnippetLength: body.htmlSnippet?.length || 0,
        timestamp: new Date().toISOString()
      }
    };

    const event = await prisma.event.create({
      data: eventData
    });

    console.log('✅ Agent event created:', event.id);

    // Link to latest analysis if job exists
    if (job) {
      try {
        const latestAnalysis = await prisma.analysis.findFirst({
          where: { jobListingId: job.id },
          orderBy: { createdAt: 'desc' }
        });

        if (latestAnalysis) {
          // Store agent event reference in analysis metadata
          const updatedMeta = {
            ...(latestAnalysis.reasonsJson || {}),
            agentEventId: event.id,
            agentValidated: body.out.validated || false,
            agentNotes: body.out.notes
          };

          await prisma.analysis.update({
            where: { id: latestAnalysis.id },
            data: { reasonsJson: updatedMeta }
          });

          console.log('🔗 Linked agent event to analysis:', latestAnalysis.id);
        }
      } catch (linkError) {
        console.warn('⚠️ Failed to link to analysis:', linkError.message);
        // Continue anyway - the event is still recorded
      }
    }

    // Return success response
    return res.status(200).json({
      ok: true,
      eventId: event.id,
      linkedJob: job?.id || null,
      linkedAnalysis: job ? 'attempted' : null
    });

  } catch (error) {
    console.error('💥 Agent ingest error:', error);
    
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
}