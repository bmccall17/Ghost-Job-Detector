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
  mostAffectedIndustries: ["Tech", "Marketing", "Finance"]
}

export const newsArticles: NewsArticle[] = [
  {
    id: '1',
    title: 'What\'s a ghost job listing? These are the warning signs',
    excerpt: 'Ghost job listings are becoming increasingly common, with experts warning job seekers to watch for specific red flags that indicate a posting may be fake or unfillable.',
    url: 'https://nypost.com/2024/10/03/lifestyle/whats-a-ghost-job-listing-these-are-the-warning-signs/',
    source: 'New York Post',
    publishedDate: '2024-10-03',
    type: 'News Report',
    tags: ['warning signs', 'job seekers', 'red flags']
  },
  {
    id: '2',
    title: 'Ghost Jobs: What they are and how to avoid them',
    excerpt: 'Understanding the phenomenon of ghost jobs and practical strategies to identify and avoid wasting time on fake job postings.',
    url: 'https://www.rezi.ai/posts/ghost-jobs',
    source: 'Rezi',
    publishedDate: '2024-08-15',
    type: 'Job Seeker Tips',
    tags: ['avoidance strategies', 'job search', 'productivity']
  },
  {
    id: '3',
    title: 'How to spot ghost jobs in your first job search and what to do instead',
    excerpt: 'First-time job seekers face unique challenges when encountering ghost jobs. This guide provides actionable steps for new graduates entering the job market.',
    url: 'https://www.collegerecruiter.com/blog/2025/07/14/how-to-spot-ghost-jobs-in-your-first-job-search-and-what-to-do-instead',
    source: 'College Recruiter',
    publishedDate: '2024-07-14',
    type: 'Job Seeker Tips',
    tags: ['first job', 'college graduates', 'job search tips']
  },
  {
    id: '4',
    title: 'The increasing presence of ghost jobs and tips to spot them',
    excerpt: 'Staffing professionals share insights on the growing trend of ghost job postings and provide expert advice on identification techniques.',
    url: 'https://staffingbystarboard.com/blog/the-increasing-presence-of-ghost-jobs-and-tips-to-spot-them-during-your-job-search/',
    source: 'Staffing by Starboard',
    publishedDate: '2024-06-20',
    type: 'Industry Impact',
    tags: ['staffing industry', 'expert insights', 'detection methods']
  },
  {
    id: '5',
    title: 'What is a ghost job?',
    excerpt: 'Indeed\'s comprehensive guide to understanding ghost jobs, their impact on job seekers, and how they affect the broader employment landscape.',
    url: 'https://www.indeed.com/career-advice/news/ghost-job',
    source: 'Indeed Career Advice',
    publishedDate: '2024-05-12',
    type: 'Research',
    tags: ['definition', 'employment trends', 'job market analysis']
  },
  {
    id: '6',
    title: 'Ghost jobs are wreaking havoc on hiring',
    excerpt: 'Wall Street Journal investigation into how ghost job postings are disrupting traditional hiring processes and affecting both employers and job seekers.',
    url: 'https://www.wsj.com/lifestyle/careers/ghost-jobs-2c0dcd4e',
    source: 'Wall Street Journal',
    publishedDate: '2024-04-28',
    type: 'News Report',
    tags: ['hiring disruption', 'industry analysis', 'employer perspective']
  },
  {
    id: '7',
    title: 'Ghost job - Wikipedia',
    excerpt: 'Comprehensive overview of ghost jobs phenomenon, including definitions, causes, impacts, and research findings from academic and industry sources.',
    url: 'https://en.wikipedia.org/wiki/Ghost_job',
    source: 'Wikipedia',
    publishedDate: '2024-03-15',
    type: 'Research',
    tags: ['encyclopedia', 'research compilation', 'academic sources']
  },
  {
    id: '8',
    title: 'How to identify ghost jobs - Reddit Discussion',
    excerpt: 'Community-driven discussion on practical methods for identifying ghost job postings, with real-world experiences shared by job seekers.',
    url: 'https://www.reddit.com/r/overemployed/comments/1git85c/how_to_identify_ghost_jobs/',
    source: 'Reddit (r/overemployed)',
    publishedDate: '2024-02-10',
    type: 'Discussion',
    tags: ['community insights', 'practical tips', 'real experiences']
  },
  {
    id: '9',
    title: 'Hiring.cafe - Combat Ghost Jobs Upstream',
    excerpt: 'A strategic solution to combat ghost job listings at their source by improving hiring practices and transparency in the recruitment process.',
    url: 'https://hiring.cafe/',
    source: 'Hiring.cafe',
    publishedDate: '2024-01-15',
    type: 'Tool',
    tags: ['prevention', 'hiring improvement', 'transparency', 'solution']
  }
]