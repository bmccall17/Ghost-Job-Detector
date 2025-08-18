// Quick script to check companies table
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompanies() {
    try {
        const companies = await prisma.company.findMany({
            orderBy: { totalPostings: 'desc' }
        });

        console.log(`📊 Found ${companies.length} companies in database:`);
        console.table(companies.map(c => ({
            name: c.name,
            normalizedName: c.normalizedName,
            totalPostings: c.totalPostings,
            avgGhostProbability: Number(c.avgGhostProbability).toFixed(4)
        })));

        // Check job listings to verify
        const jobListings = await prisma.jobListing.findMany({
            select: { company: true, title: true, id: true },
            orderBy: { company: 'asc' }
        });

        console.log(`\n📋 Found ${jobListings.length} job listings:`);
        const companyCounts = {};
        jobListings.forEach(job => {
            companyCounts[job.company] = (companyCounts[job.company] || 0) + 1;
        });

        console.table(companyCounts);

    } catch (error) {
        console.error('Error checking companies:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCompanies().catch(console.error);