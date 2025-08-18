// Verify Stanley 1913 location fix
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyStanleyFix() {
    try {
        const stanleyJob = await prisma.jobListing.findFirst({
            where: {
                company: 'Stanley 1913',
                title: { contains: 'Director, Product Management' }
            },
            select: {
                id: true,
                title: true,
                company: true,
                location: true,
                canonicalUrl: true,
                updatedAt: true
            }
        });

        if (stanleyJob) {
            console.log('🎯 Stanley 1913 Job Verification:');
            console.log('   ✅ Title:', stanleyJob.title);
            console.log('   ✅ Company:', stanleyJob.company);
            console.log('   ✅ Location:', stanleyJob.location);
            console.log('   📎 URL:', stanleyJob.canonicalUrl);
            console.log('   📅 Last Updated:', stanleyJob.updatedAt);
            
            if (stanleyJob.location === 'Seattle, WA') {
                console.log('\n🎉 SUCCESS: Stanley 1913 job now has correct location "Seattle, WA"!');
                console.log('   The parsing issue has been resolved.');
            } else {
                console.log('\n⚠️  Location is not as expected. Current value:', stanleyJob.location);
            }
        } else {
            console.log('❌ Stanley 1913 job not found');
        }

    } catch (error) {
        console.error('💥 Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyStanleyFix().catch(console.error);