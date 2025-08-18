// Script to consolidate duplicate companies - JavaScript version
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Basic normalization function (simplified version of the TypeScript service)
function normalizeCompanyName(companyName) {
    if (!companyName || companyName.trim().length === 0) {
        return {
            canonical: 'Unknown Company',
            normalized: 'unknown company',
            confidence: 0,
            isLearned: false
        };
    }

    const cleanName = companyName.trim();
    
    // Apply basic normalization rules
    let normalized = cleanName
        .replace(/\s+(inc|corp|corporation|llc|ltd|company|co)\s*$/i, '') // Remove suffixes
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaced
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/[-_]+/g, ' ') // Hyphens/underscores to spaces
        .replace(/[^\w\s&]/g, '') // Remove special characters
        .replace(/\b&\b/g, 'and') // & to and
        .trim();

    // Known company variations
    const knownVariations = {
        'red ventures': 'Red Ventures',
        'redventures': 'Red Ventures',
        'red-ventures': 'Red Ventures',
        'redventure': 'Red Ventures',
        'google inc': 'Google',
        'google llc': 'Google',
        'alphabet inc': 'Google',
        'alphabet': 'Google',
        'microsoft corp': 'Microsoft',
        'microsoft corporation': 'Microsoft',
        'msft': 'Microsoft',
        'amazon.com': 'Amazon',
        'amazon web services': 'Amazon',
        'aws': 'Amazon'
    };

    const normalizedKey = normalized.toLowerCase();
    const canonical = knownVariations[normalizedKey] || normalized;

    return {
        canonical,
        normalized: normalizedKey,
        confidence: knownVariations[normalizedKey] ? 0.95 : 0.7,
        isLearned: !!knownVariations[normalizedKey]
    };
}

// Calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            );
        }
    }

    return matrix[str2.length][str1.length];
}

// Detect duplicate companies
function detectCompanyDuplicates(companies) {
    const duplicateGroups = [];
    const processed = new Set();

    for (const company of companies) {
        if (processed.has(company.id)) continue;

        const normalized = normalizeCompanyName(company.name);
        const potentialDuplicates = companies.filter(c => 
            c.id !== company.id && 
            !processed.has(c.id) &&
            areCompaniesSimilar(company.name, c.name)
        );

        if (potentialDuplicates.length > 0) {
            const group = {
                canonical: normalized.canonical,
                duplicates: [company, ...potentialDuplicates],
                confidence: normalized.confidence
            };

            duplicateGroups.push(group);
            
            // Mark all as processed
            processed.add(company.id);
            potentialDuplicates.forEach(d => processed.add(d.id));
        }
    }

    return duplicateGroups;
}

function areCompaniesSimilar(name1, name2) {
    const norm1 = normalizeCompanyName(name1);
    const norm2 = normalizeCompanyName(name2);

    // If they normalize to the same canonical name, they're similar
    if (norm1.canonical === norm2.canonical || norm1.normalized === norm2.normalized) {
        return true;
    }

    // Check string similarity
    const similarity = calculateStringSimilarity(norm1.normalized, norm2.normalized);
    return similarity > 0.85;
}

async function consolidateCompanies() {
    try {
        console.log('🔄 Starting company consolidation with intelligent learning...');
        
        // Get all companies
        const allCompanies = await prisma.company.findMany({
            orderBy: { totalPostings: 'desc' }
        });

        console.log(`📊 Found ${allCompanies.length} companies in database`);

        // Detect duplicate groups
        const duplicateGroups = detectCompanyDuplicates(
            allCompanies.map(c => ({ 
                name: c.name, 
                id: c.id, 
                totalPostings: c.totalPostings 
            }))
        );

        console.log(`🔍 Found ${duplicateGroups.length} duplicate company groups to consolidate`);

        let totalConsolidated = 0;
        
        for (const group of duplicateGroups) {
            console.log(`\n🏢 Consolidating company group: "${group.canonical}"`);
            console.log(`   📋 Duplicates found:`, group.duplicates.map(d => `"${d.name}" (${d.totalPostings} postings)`));
            
            // Select the canonical company (usually the one with most postings)
            const canonicalCompany = group.duplicates.reduce((prev, current) => 
                current.totalPostings > prev.totalPostings ? current : prev
            );
            
            console.log(`   ✅ Selected canonical company: "${canonicalCompany.name}" (${canonicalCompany.totalPostings} postings)`);
            
            // Get all job listings for all duplicate companies
            const duplicateCompanyNames = group.duplicates.map(d => d.name);
            const allJobListings = await prisma.jobListing.findMany({
                where: { 
                    company: { in: duplicateCompanyNames }
                },
                include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            console.log(`   📄 Found ${allJobListings.length} total job listings across all duplicates`);

            // Update all job listings to use the canonical company name
            const updateResult = await prisma.jobListing.updateMany({
                where: { 
                    company: { in: duplicateCompanyNames.filter(name => name !== canonicalCompany.name) }
                },
                data: { 
                    company: group.canonical // Use the normalized canonical name
                }
            });

            console.log(`   🔄 Updated ${updateResult.count} job listings to canonical company name`);

            // Recalculate statistics for the canonical company
            const totalPostings = allJobListings.length;
            const avgGhostProbability = allJobListings.reduce((sum, listing) => {
                const latestAnalysis = listing.analyses[0];
                return sum + (latestAnalysis ? Number(latestAnalysis.score) : 0);
            }, 0) / totalPostings;

            // Update the canonical company with consolidated statistics
            const canonicalNormalization = normalizeCompanyName(group.canonical);
            await prisma.company.update({
                where: { id: canonicalCompany.id },
                data: {
                    name: group.canonical,
                    normalizedName: canonicalNormalization.normalized,
                    totalPostings,
                    avgGhostProbability,
                    lastAnalyzedAt: new Date()
                }
            });

            console.log(`   📊 Updated canonical company stats: ${totalPostings} postings, ${avgGhostProbability.toFixed(4)} avg ghost probability`);

            // Delete duplicate company entries (keep only the canonical one)
            const duplicatesToDelete = group.duplicates
                .filter(d => d.id !== canonicalCompany.id)
                .map(d => d.id);

            if (duplicatesToDelete.length > 0) {
                const deleteResult = await prisma.company.deleteMany({
                    where: { 
                        id: { in: duplicatesToDelete }
                    }
                });

                console.log(`   🗑️  Deleted ${deleteResult.count} duplicate company entries`);
            }

            totalConsolidated += group.duplicates.length - 1; // -1 because we keep the canonical
        }

        // Verify final state
        const finalCompaniesCount = await prisma.company.count();
        console.log(`\n🎉 Company consolidation completed!`);
        console.log(`📈 Companies consolidated: ${totalConsolidated}`);
        console.log(`📊 Final companies count: ${finalCompaniesCount}`);

        // Show final Red Ventures status
        const redVenturesCompanies = await prisma.company.findMany({
            where: {
                OR: [
                    { name: { contains: 'Red Ventures', mode: 'insensitive' } },
                    { name: { contains: 'Redventures', mode: 'insensitive' } }
                ]
            }
        });

        console.log(`\n🔍 Red Ventures after consolidation:`, redVenturesCompanies.map(c => ({
            name: c.name,
            normalizedName: c.normalizedName,
            totalPostings: c.totalPostings
        })));

    } catch (error) {
        console.error('💥 Company consolidation failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the consolidation
consolidateCompanies().catch(console.error);