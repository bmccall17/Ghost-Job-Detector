// Script to clean up corrupted location data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupLocationData() {
    try {
        console.log('🧹 Starting location data cleanup...');
        
        // Find all jobs with corrupted location data
        const corruptedJobs = await prisma.jobListing.findMany({
            where: {
                location: {
                    not: null
                }
            },
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                canonicalUrl: true
            }
        });

        console.log(`📊 Found ${corruptedJobs.length} jobs with location data to check...`);

        const corruptedLocationJobs = [];
        const validLocationJobs = [];

        // Categorize jobs by location data quality
        for (const job of corruptedJobs) {
            const location = job.location;
            
            // Check if location contains HTML content or other garbage
            const isCorrupted = location.includes('<') || 
                              location.includes('>') || 
                              location.includes('class=') || 
                              location.includes('data-') ||
                              location.includes('placeholder') || 
                              location.includes('input') ||
                              location.includes('role=') || 
                              location.includes('maxlength') ||
                              location.includes('search') ||
                              location.includes('control') ||
                              location.length > 200; // Suspiciously long

            if (isCorrupted) {
                corruptedLocationJobs.push(job);
                console.log(`❌ Corrupted location found in job "${job.title}" (${job.company}):`, 
                    location.substring(0, 100) + (location.length > 100 ? '...' : ''));
            } else {
                validLocationJobs.push(job);
            }
        }

        console.log(`\n📈 Cleanup Analysis:`);
        console.log(`   Valid locations: ${validLocationJobs.length}`);
        console.log(`   Corrupted locations: ${corruptedLocationJobs.length}`);

        if (validLocationJobs.length > 0) {
            console.log(`\n✅ Valid location examples:`);
            validLocationJobs.slice(0, 5).forEach(job => {
                console.log(`   "${job.title}" at ${job.company}: "${job.location}"`);
            });
        }

        // Clean up corrupted location data
        if (corruptedLocationJobs.length > 0) {
            console.log(`\n🔧 Cleaning up ${corruptedLocationJobs.length} corrupted location entries...`);
            
            // Update corrupted locations to NULL so they can be re-parsed correctly
            const cleanupResult = await prisma.jobListing.updateMany({
                where: {
                    id: { in: corruptedLocationJobs.map(job => job.id) }
                },
                data: {
                    location: null
                }
            });

            console.log(`✅ Cleaned up ${cleanupResult.count} corrupted location entries`);

            // Special handling for the Stanley 1913 job mentioned in the issue
            const stanleyJob = corruptedLocationJobs.find(job => 
                job.company === 'Stanley 1913' && 
                job.title.includes('Director, Product Management')
            );

            if (stanleyJob) {
                console.log(`\n🎯 Special case: Stanley 1913 job location has been reset to NULL`);
                console.log(`   This job should now correctly extract "Seattle, WA" on next analysis`);
                console.log(`   LinkedIn URL: ${stanleyJob.canonicalUrl}`);
                
                // Manually set the correct location based on screenshot evidence
                await prisma.jobListing.update({
                    where: { id: stanleyJob.id },
                    data: { location: 'Seattle, WA' }
                });
                
                console.log(`✅ Manually corrected Stanley 1913 location to "Seattle, WA"`);
            }
        }

        // Final statistics
        const totalJobs = await prisma.jobListing.count();
        const jobsWithLocation = await prisma.jobListing.count({
            where: { location: { not: null } }
        });
        const jobsWithoutLocation = totalJobs - jobsWithLocation;

        console.log(`\n📊 Final Location Statistics:`);
        console.log(`   Total jobs: ${totalJobs}`);
        console.log(`   Jobs with valid location: ${jobsWithLocation}`);
        console.log(`   Jobs without location: ${jobsWithoutLocation}`);
        console.log(`   Missing location rate: ${((jobsWithoutLocation / totalJobs) * 100).toFixed(1)}%`);

        console.log(`\n🚀 Next Steps:`);
        console.log(`   - Enhanced LinkedIn parser will improve future location extraction`);
        console.log(`   - Jobs without location will benefit from improved parsing patterns`);
        console.log(`   - Location validation prevents HTML garbage from being stored`);

    } catch (error) {
        console.error('💥 Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupLocationData().catch(console.error);