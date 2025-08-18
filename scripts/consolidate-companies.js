// Script to consolidate duplicate companies using intelligent normalization
import { PrismaClient } from '@prisma/client';
import { CompanyNormalizationService } from '../src/services/CompanyNormalizationService.js';

const prisma = new PrismaClient();

async function consolidateCompanies() {
    try {
        console.log('🔄 Starting company consolidation with intelligent learning...');
        
        const normalizationService = CompanyNormalizationService.getInstance();
        
        // Get all companies
        const allCompanies = await prisma.company.findMany({
            orderBy: { totalPostings: 'desc' }
        });

        console.log(`📊 Found ${allCompanies.length} companies in database`);

        // Detect duplicate groups
        const duplicateGroups = await normalizationService.detectCompanyDuplicates(
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
                    company: canonicalCompany.name
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
            await prisma.company.update({
                where: { id: canonicalCompany.id },
                data: {
                    name: group.canonical, // Use the normalized canonical name
                    normalizedName: normalizationService.normalizeCompanyName(group.canonical).normalized,
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

            // Learn the company variations for future detection
            for (const duplicate of group.duplicates) {
                if (duplicate.name !== group.canonical) {
                    normalizationService.learnCompanyVariation(
                        group.canonical,
                        duplicate.name,
                        undefined,
                        undefined,
                        group.confidence
                    );
                    console.log(`   🧠 Learned variation: "${duplicate.name}" -> "${group.canonical}"`);
                }
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