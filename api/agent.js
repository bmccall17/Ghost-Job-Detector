/**
 * Agent API Endpoints - Consolidated
 * Handles both agent fallback validation and result ingestion
 */
import { prisma } from '../lib/db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode = 'fallback' } = req.query;

  // Route to appropriate handler
  if (mode === 'ingest') {
    return handleIngest(req, res);
  } else {
    return handleFallback(req, res);
  }
}

/**
 * Agent Fallback Handler
 * Server-side AI validation using Groq with structured JSON output
 */
async function handleFallback(req, res) {
  try {
    // Check feature flags
    if (process.env.AGENT_ENABLED !== 'true' || process.env.AGENT_USE_SERVER_FALLBACK !== 'true') {
      console.log('🚫 Agent fallback disabled by feature flags');
      return res.status(403).json({ 
        ok: false, 
        error: 'fallback_disabled',
        message: 'Server fallback is disabled'
      });
    }

    const { url, htmlSnippet, parserOutput } = req.body;

    // Validate request payload
    if (!url || !htmlSnippet || !parserOutput) {
      return res.status(400).json({ 
        ok: false, 
        error: 'bad_request',
        message: 'Missing required fields: url, htmlSnippet, parserOutput' 
      });
    }

    console.log('🤖 Agent fallback request for:', url);

    // Enhanced JSON Schema for detailed analysis output
    const AgentJsonSchema = {
      type: "object",
      required: ["validated", "fields"],
      properties: {
        validated: { type: "boolean" },
        fields: {
          type: "object",
          properties: {
            title: { 
              type: "object", 
              properties: { 
                value: { type: "string" }, 
                conf: { type: "number", minimum: 0, maximum: 1 } 
              }, 
              required: ["value", "conf"] 
            },
            company: { 
              type: "object", 
              properties: { 
                value: { type: "string" }, 
                conf: { type: "number", minimum: 0, maximum: 1 } 
              }, 
              required: ["value", "conf"] 
            },
            location: { 
              type: "object", 
              properties: { 
                value: { type: "string" }, 
                conf: { type: "number", minimum: 0, maximum: 1 } 
              }, 
              required: ["value", "conf"] 
            }
          },
          additionalProperties: false
        },
        notes: { type: "string" },
        analysis: {
          type: "object",
          properties: {
            thoughtProcess: { type: "array", items: { type: "string" } },
            linksChecked: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  platform: { type: "string" },
                  status: { type: "string", enum: ["accessible", "blocked", "not_found", "error"] },
                  findings: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 }
                }
              }
            },
            companyResearch: {
              type: "object",
              properties: {
                companyName: { type: "string" },
                domain: { type: "string" },
                businessContext: { type: "string" },
                recentActivity: { type: "array", items: { type: "string" } },
                locationVerification: { type: "string" },
                legitimacyScore: { type: "number", minimum: 0, maximum: 1 }
              }
            },
            crossPlatformCheck: {
              type: "object",
              properties: {
                platformsFound: { type: "array", items: { type: "string" } },
                consistentInfo: { type: "boolean" },
                duplicatesDetected: { type: "number" },
                postingPattern: { type: "string", enum: ["single", "multiple", "suspicious"] }
              }
            },
            confidenceBreakdown: {
              type: "object",
              properties: {
                overallConfidence: { type: "number", minimum: 0, maximum: 1 },
                titleConfidence: { type: "number", minimum: 0, maximum: 1 },
                companyConfidence: { type: "number", minimum: 0, maximum: 1 },
                locationConfidence: { type: "number", minimum: 0, maximum: 1 },
                legitimacyConfidence: { type: "number", minimum: 0, maximum: 1 },
                reasoningQuality: { type: "number", minimum: 0, maximum: 1 }
              }
            },
            verificationSteps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "number" },
                  action: { type: "string" },
                  result: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  nextSteps: { type: "array", items: { type: "string" } }
                }
              }
            },
            finalAssessment: { type: "string" },
            riskFactors: { type: "array", items: { type: "string" } },
            legitimacyIndicators: { type: "array", items: { type: "string" } }
          }
        }
      },
      additionalProperties: false
    };

    // Prepare Groq API request
    const groqModel = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';
    const payload = {
      model: groqModel,
      response_format: { 
        type: "json_schema", 
        json_schema: { 
          name: "AgentOutput", 
          schema: AgentJsonSchema 
        }
      },
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { 
          role: "system", 
          content: `You are an advanced job posting legitimacy analyzer and field validator. Perform comprehensive analysis similar to a professional investigative researcher.

ANALYSIS PROCESS (follow this exact methodology):

1. THOUGHT PROCESS DOCUMENTATION
   - Document your reasoning step-by-step in thoughtProcess array
   - Show your analytical process for transparency
   - Include estimated thinking time like "Thought for 15s"

2. FIELD EXTRACTION & VALIDATION
   - Extract and validate: title, company, location
   - Compare against HTML content for accuracy
   - Identify any parsing errors or improvements needed

3. EXTERNAL VERIFICATION (simulate these checks)
   - Simulate company website analysis and domain verification
   - Simulate cross-platform job posting searches
   - Simulate company legitimacy and recent business activity research
   - Simulate location and office verification

4. COMPREHENSIVE ASSESSMENT
   - Rate overall legitimacy vs ghost job probability
   - Identify specific risk factors and legitimacy indicators
   - Provide detailed confidence breakdown for each component
   - Suggest actionable verification steps

CONFIDENCE SCORING:
- 0.95-1.0: Extremely confident, multiple verification sources
- 0.85-0.94: Highly confident, strong evidence
- 0.70-0.84: Confident, good supporting evidence  
- 0.50-0.69: Moderate confidence, some uncertainty
- 0.30-0.49: Low confidence, significant concerns
- 0.0-0.29: Very low confidence, major red flags

Be thorough, analytical, and provide actionable insights like a professional job market investigator. Only emit JSON matching the exact schema provided.` 
        },
        { 
          role: "user", 
          content: JSON.stringify({ 
            url, 
            htmlSnippet: htmlSnippet.slice(0, 8000),
            parserOutput 
          }) 
        }
      ]
    };

    // Check for Groq API key
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }

    console.log('🔄 Calling Groq API with model:', groqModel);

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API error:', response.status, errorText);
      return res.status(502).json({ 
        ok: false, 
        error: 'upstream', 
        status: response.status,
        message: 'Groq API request failed'
      });
    }

    const data = await response.json();
    console.log('✅ Groq API response received');

    // Parse the structured JSON response
    let agentOutput;
    try {
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in Groq response');
      }
      
      agentOutput = JSON.parse(content);
      console.log('📊 Parsed agent output:', { 
        validated: agentOutput.validated,
        fieldCount: Object.keys(agentOutput.fields || {}).length 
      });
    } catch (parseError) {
      console.error('❌ Failed to parse Groq response:', parseError);
      return res.status(502).json({ 
        ok: false, 
        error: 'parse_error',
        message: 'Failed to parse AI response'
      });
    }

    // Forward to ingest handler for persistence
    try {
      const ingestPayload = {
        url,
        htmlSnippet,
        parserOutput,
        agent: 'server',
        out: agentOutput
      };

      const ingestResult = await handleIngest({ body: ingestPayload }, res, true);
      if (ingestResult?.eventId) {
        console.log('💾 Agent result persisted:', ingestResult.eventId);
      }
    } catch (ingestError) {
      console.warn('⚠️ Ingest forwarding failed:', ingestError.message);
      // Continue anyway - we still return the result
    }

    // Return successful response
    return res.status(200).json({
      ok: true,
      out: agentOutput,
      model: groqModel,
      source: 'groq_fallback'
    });

  } catch (error) {
    console.error('💥 Agent fallback error:', error);
    
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
}

/**
 * Agent Ingest Handler
 * Persists agent validation results and links them to analyses
 */
async function handleIngest(req, res, internal = false) {
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
      const error = { 
        ok: false, 
        error: 'bad_request',
        message: 'Missing required fields: url, out' 
      };
      
      if (internal) return error;
      return res.status(400).json(error);
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
      const result = { 
        ok: true, 
        eventId: existing.id, 
        dedup: true 
      };
      
      if (internal) return result;
      return res.status(200).json(result);
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
    const result = {
      ok: true,
      eventId: event.id,
      linkedJob: job?.id || null,
      linkedAnalysis: job ? 'attempted' : null
    };

    if (internal) return result;
    return res.status(200).json(result);

  } catch (error) {
    console.error('💥 Agent ingest error:', error);
    
    const errorResponse = {
      ok: false,
      error: 'internal_error',
      message: error.message
    };

    if (internal) return errorResponse;
    return res.status(500).json(errorResponse);
  }
}