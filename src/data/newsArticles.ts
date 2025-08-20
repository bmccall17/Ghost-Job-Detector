export interface NewsArticle {
  id: string
  title: string
  excerpt: string
  url: string
  source: string
  publishedDate: string
  type: 'Research' | 'Industry Impact' | 'Job Seeker Tips' | 'News Report' | 'Discussion' | 'Tool'
  tags: string[]
}

export const ghostJobStats = {
  prevalence: "43%",
  avgPostingDuration: "67 days",
  mostAffectedIndustries: ["Healthcare (29%)", "Manufacturing (18%)", "Engineering (15%)"],
  ghostingByAgencies: "67%",
  directEmployerGhosting: "2%",
  timeWastedPerYear: "9 hours",
  remoteGhostingRate: "11%",
  onsiteGhostingRate: "8%",
  wouldNotReapply: "43%",
  transparentSalaryGhosting: "1%",
  opaqueListingGhosting: "11%"
}

// Updated with 2025 Ghost Job Report - v0.1.7
export const newsArticles: NewsArticle[] = [
  {
    id: '1',
    title: 'How to spot ghost jobs in your first job search and what to do instead',
    excerpt: 'First-time job seekers face unique challenges when encountering ghost jobs. This guide provides actionable steps for new graduates entering the job market.',
    url: 'https://www.collegerecruiter.com/blog/2025/07/14/how-to-spot-ghost-jobs-in-your-first-job-search-and-what-to-do-instead',
    source: 'College Recruiter',
    publishedDate: '2025-07-14',
    type: 'Job Seeker Tips',
    tags: ['first job', 'college graduates', 'job search tips']
  },
  {
    id: '2',
    title: 'Ghost Jobs: What they are and how to avoid them',
    excerpt: 'Understanding the phenomenon of ghost jobs and practical strategies to identify and avoid wasting time on fake job postings.',
    url: 'https://www.rezi.ai/posts/ghost-jobs',
    source: 'Rezi',
    publishedDate: '2025-07-08',
    type: 'Job Seeker Tips',
    tags: ['avoidance strategies', 'job search', 'productivity']
  },
  {
    id: '3',
    title: 'The 2025 Ghosted Jobs Report: The Hidden Crisis Costing Job Seekers Time and Companies Top Talent',
    excerpt: 'Comprehensive 2025 research reveals 67% of job applications are ghosted by staffing agencies, while salary transparency reduces ghosting to just 1%. Healthcare leads ghosting rates at 29%.',
    url: 'https://jobright.ai/blog/the-2025-ghosted-jobs-report%EF%BC%9Athe-hidden-crisis-costing-job-seekers-time-and-companies-top-talent/',
    source: 'JobRight.ai',
    publishedDate: '2025-07-01',
    type: 'Research',
    tags: ['2025 data', 'comprehensive study', 'salary transparency', 'industry statistics', 'ghosting rates']
  },
  {
    id: '4',
    title: 'What\'s a ghost job listing? These are the warning signs',
    excerpt: 'Ghost job listings are becoming increasingly common, with experts warning job seekers to watch for specific red flags that indicate a posting may be fake or unfillable.',
    url: 'https://nypost.com/2024/10/03/lifestyle/whats-a-ghost-job-listing-these-are-the-warning-signs/',
    source: 'New York Post',
    publishedDate: '2024-10-03',
    type: 'News Report',
    tags: ['warning signs', 'job seekers', 'red flags']
  },
  {
    id: '5',
    title: 'The increasing presence of ghost jobs and tips to spot them',
    excerpt: 'Staffing professionals share insights on the growing trend of ghost job postings and provide expert advice on identification techniques.',
    url: 'https://staffingbystarboard.com/blog/the-increasing-presence-of-ghost-jobs-and-tips-to-spot-them-during-your-job-search/',
    source: 'Staffing by Starboard',
    publishedDate: '2024-06-20',
    type: 'Industry Impact',
    tags: ['staffing industry', 'expert insights', 'detection methods']
  },
  {
    id: '6',
    title: 'What is a ghost job?',
    excerpt: 'Indeed\'s comprehensive guide to understanding ghost jobs, their impact on job seekers, and how they affect the broader employment landscape.',
    url: 'https://www.indeed.com/career-advice/news/ghost-job',
    source: 'Indeed Career Advice',
    publishedDate: '2024-05-12',
    type: 'Research',
    tags: ['definition', 'employment trends', 'job market analysis']
  },
  {
    id: '7',
    title: 'Ghost jobs are wreaking havoc on hiring',
    excerpt: 'Wall Street Journal investigation into how ghost job postings are disrupting traditional hiring processes and affecting both employers and job seekers.',
    url: 'https://www.wsj.com/lifestyle/careers/ghost-jobs-2c0dcd4e',
    source: 'Wall Street Journal',
    publishedDate: '2024-04-28',
    type: 'News Report',
    tags: ['hiring disruption', 'industry analysis', 'employer perspective']
  },
  {
    id: '8',
    title: 'Ghost job - Wikipedia',
    excerpt: 'Comprehensive overview of ghost jobs phenomenon, including definitions, causes, impacts, and research findings from academic and industry sources.',
    url: 'https://en.wikipedia.org/wiki/Ghost_job',
    source: 'Wikipedia',
    publishedDate: '2024-03-15',
    type: 'Research',
    tags: ['encyclopedia', 'research compilation', 'academic sources']
  },
  {
    id: '9',
    title: 'How to identify ghost jobs - Reddit Discussion',
    excerpt: 'Community-driven discussion on practical methods for identifying ghost job postings, with real-world experiences shared by job seekers.',
    url: 'https://www.reddit.com/r/overemployed/comments/1git85c/how_to_identify_ghost_jobs/',
    source: 'Reddit (r/overemployed)',
    publishedDate: '2024-02-10',
    type: 'Discussion',
    tags: ['community insights', 'practical tips', 'real experiences']
  },
  {
    id: '10',
    title: 'Hiring.cafe - Combat Ghost Jobs Upstream',
    excerpt: 'A strategic solution to combat ghost job listings at their source by improving hiring practices and transparency in the recruitment process.',
    url: 'https://hiring.cafe/',
    source: 'Hiring.cafe',
    publishedDate: '2024-01-15',
    type: 'Tool',
    tags: ['prevention', 'hiring improvement', 'transparency', 'solution']
  }
]