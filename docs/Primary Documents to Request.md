Primary Documents to Request

1. System Architecture Diagram

High-level overview of all system components, services, and their relationships
Data flow between components
External integrations and dependencies
Technology stack for each component

2. API Documentation \& Service Map

Complete inventory of all APIs (internal and external)
Service dependencies and communication patterns
Authentication and authorization flows
Rate limits, SLAs, and performance characteristics

3. Database Schema \& Data Flow Documentation

Entity relationship diagrams
Data models and relationships
Data migration history and current state
Data retention and archival policies

4. Feature-to-Code Mapping Document

Which business features map to which code modules/services
Feature flags and their current states
A/B tests and their technical implementations
Configuration management overview

Secondary Supporting Documents
5. Technical Debt \& Code Health Report

Dead code analysis
Unused functions and endpoints
Code coverage metrics
Dependencies audit (outdated libraries, security vulnerabilities)

6. Infrastructure \& Deployment Map

Server/cloud resource inventory
Environment configurations (dev, staging, prod)
CI/CD pipeline documentation
Monitoring and logging setup

7. Integration Inventory

Third-party services and APIs used
Webhooks and event subscriptions
Data synchronization processes
Authentication tokens and API keys management





Questions to Guide Your Engineering Teams
When requesting these documents, provide these guiding questions:

"What code exists that doesn't correspond to any current product feature?"
"Which APIs or endpoints are no longer being called by any client?"
"What background jobs or scheduled tasks are running, and what business purpose do they serve?"
"Which database tables or columns are no longer actively used?"
"What services could we theoretically shut down without impacting users?"





Format Recommendations
Ask for these documents to be delivered as:

Visual diagrams where possible (architecture, data flow)
Spreadsheets or tables for inventories (APIs, integrations, features)
Markdown or wiki pages for detailed documentation
Dashboard links for real-time metrics and monitoring





Subagent Task Assignments

Subagent 1: Architecture \& Dependency Mapper :: Task: "Analyze the codebase and create a comprehensive system architecture map"

Subagent 2: Dead Code \& Orphaned Function Detective :: Task: "Identify unused code, orphaned functions, and dead endpoints"

Subagent 3: Feature-to-Code Mapper :: Task: "Map business features to their technical implementations"

Subagent 4: Integration \& External Dependencies Auditor :: Task: "Catalog all external integrations and third-party dependencies"

Subagent 5: Data Flow \& Database Analyst :: Task: "Map data structures, flows, and identify unused database elements"









Coordination Instructions for Main Agent

Main orchestrator prompt:



You are coordinating a comprehensive product audit using the outputs from 5 specialized subagents. 



Your tasks:

1\. Synthesize findings from all subagents into a master report

2\. Cross-reference findings to identify discrepancies or confirmations

3\. Prioritize findings by business impact and technical risk

4\. Create an executive summary suitable for Product Owner and business stakeholder review

5\. Generate actionable recommendations with effort estimates



Consolidation priorities:

\- Flag critical issues (security vulnerabilities, performance bottlenecks)

\- Identify quick wins (obvious dead code that can be safely removed)

\- Highlight architectural concerns that need business input

\- Suggest refactoring opportunities that could reduce technical debt



Final deliverables:

1\. Executive summary (2 pages max)

2\. Detailed technical findings report

3\. Prioritized action plan with effort estimates

4\. Risk assessment matrix









