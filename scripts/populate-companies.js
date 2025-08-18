// Script to populate companies table from existing job listings
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateCompanies() {
    try {
        console.log('🚀 Starting company population...');
        
        // Get all unique companies from job_listings
        const jobListings = await prisma.jobListing.findMany({
            select: {
                company: true,
                id: true
            }
        });

        // Get unique company names
        const uniqueCompanies = [...new Set(jobListings.map(j => j.company))];
        console.log(`📊 Found ${jobListings.length} job listings with ${uniqueCompanies.length} unique companies`);
        
        // Check current companies table
        const existingCompanies = await prisma.company.count();
        console.log(`📋 Companies table currently has ${existingCompanies} entries`);
        
        const results = [];
        
        for (const companyName of uniqueCompanies) {
            console.log(`\n🏢 Processing company: "${companyName}"`);
            
            try {
                await updateCompanyStats(companyName);
                results.push({ company: companyName, status: 'success' });
                console.log(`✅ Successfully processed: ${companyName}`);
            } catch (error) {
                console.error(`❌ Failed to process ${companyName}:`, error.message);
                results.push({ company: companyName, status: 'error', error: error.message });
            }
        }

        // Verify results
        const finalCompaniesCount = await prisma.company.count();
        console.log(`\n🎉 Company population completed!`);
        console.log(`📈 Companies table now has ${finalCompaniesCount} entries (was ${existingCompanies})`);
        console.log(`📊 Processed ${results.length} companies:`);
        
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   ❌ Failed: ${failed}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed companies:');
            results.filter(r => r.status === 'error').forEach(r => {
                console.log(`   - ${r.company}: ${r.error}`);
            });
        }

    } catch (error) {
        console.error('💥 Company population failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Enhanced company stats function with better matching
async function updateCompanyStats(companyName) {
    try {
        // Clean and validate company name
        if (!companyName || companyName.trim().length === 0) {
            throw new Error('Empty company name');
        }

        // Clean up company name (decode HTML entities, normalize)
        const cleanCompanyName = companyName
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

        // Skip generic or invalid company names
        const invalidNames = ['unknown company', 'linkedin company', 'unknown', 'linkedin'];
        if (invalidNames.includes(cleanCompanyName.toLowerCase())) {
            throw new Error(`Generic company name: ${cleanCompanyName}`);
        }

        const normalizedName = cleanCompanyName.toLowerCase().trim();
        
        console.log(`   📝 Clean name: "${cleanCompanyName}" (normalized: "${normalizedName}")`);
        
        // Get or create company
        const company = await prisma.company.upsert({
            where: { normalizedName },
            update: {},
            create: {
                name: cleanCompanyName,
                normalizedName
            }
        });

        console.log(`   💾 Company upserted: ${company.id}`);

        // Find job listings for this company - try multiple matching strategies
        let companyListings = await prisma.jobListing.findMany({
            where: { company: cleanCompanyName },
            include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        // If no matches with cleaned name, try with original name 
        if (companyListings.length === 0 && cleanCompanyName !== companyName) {
            console.log(`   🔄 Trying original name: "${companyName}"`);
            companyListings = await prisma.jobListing.findMany({
                where: { company: companyName },
                include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });
        }

        // If still no matches, try case-insensitive search
        if (companyListings.length === 0) {
            console.log(`   🔍 Trying case-insensitive search...`);
            const allListings = await prisma.jobListing.findMany({
                select: { company: true, id: true }
            });
            
            // Try to find a case-insensitive match
            const matchingCompany = allListings.find(listing => 
                listing.company.toLowerCase() === cleanCompanyName.toLowerCase() ||
                listing.company.toLowerCase() === companyName.toLowerCase()
            );
            
            if (matchingCompany) {
                console.log(`   🎯 Found case-insensitive match: "${matchingCompany.company}"`);
                companyListings = await prisma.jobListing.findMany({
                    where: { company: matchingCompany.company },
                    include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
                });
            }
        }

        console.log(`   📋 Found ${companyListings.length} job listings`);
        
        if (companyListings.length === 0) {
            throw new Error(`No job listings found for company`);
        }

        const totalPostings = companyListings.length;
        const avgGhostProbability = companyListings.reduce((sum, listing) => {
            const latestAnalysis = listing.analyses[0];
            return sum + (latestAnalysis ? Number(latestAnalysis.score) : 0);
        }, 0) / totalPostings;

        await prisma.company.update({
            where: { id: company.id },
            data: {
                totalPostings,
                avgGhostProbability,
                lastAnalyzedAt: new Date()
            }
        });

        console.log(`   📊 Stats updated: ${totalPostings} postings, ${avgGhostProbability.toFixed(4)} avg ghost probability`);
    } catch (error) {
        console.error(`   💥 Error updating company stats: ${error.message}`);
        throw error;
    }
}

// Run the script
populateCompanies().catch(console.error);