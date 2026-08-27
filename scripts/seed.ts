
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const companies = ["Stripe", "Airbnb", "Riot Games", "Figma", "Vercel", "Notion", "Spotify", "Atlassian", "Datadog", "GitHub", "Shopify", "Coinbase", "Robinhood", "Discord", "Canva"];
const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Remote, US", "Seattle, WA", "London, UK", "Berlin, DE", "Remote, Global"];

const jobTemplates = [
  { title: "Senior Frontend Engineer", skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "GraphQL"], baseSalary: 140000 },
  { title: "Junior Data Analyst", skills: ["SQL", "Python", "Tableau", "Excel", "Data Visualization"], baseSalary: 70000 },
  { title: "Product Manager", skills: ["Agile", "Roadmapping", "User Research", "Jira", "Analytics"], baseSalary: 120000 },
  { title: "Backend Engineer", skills: ["Node.js", "PostgreSQL", "AWS", "Docker", "REST APIs"], baseSalary: 130000 },
  { title: "UX/UI Designer", skills: ["Figma", "Prototyping", "User Research", "Design Systems"], baseSalary: 95000 },
  { title: "Machine Learning Engineer", skills: ["Python", "PyTorch", "TensorFlow", "NLP", "Vector Databases"], baseSalary: 160000 },
  { title: "DevOps Engineer", skills: ["Kubernetes", "Terraform", "CI/CD", "AWS", "Linux"], baseSalary: 145000 },
  { title: "Full Stack Developer", skills: ["React", "Node.js", "Prisma", "PostgreSQL", "Tailwind"], baseSalary: 115000 },
];

async function main() {
  console.log("Clearing existing data...");
  await prisma.job.deleteMany();

  console.log("Generating 300 hyper-realistic jobs...");
  const jobsToCreate = [];

  for (let i = 0; i < 300; i++) {
    const template = jobTemplates[i % jobTemplates.length];
    const company = companies[i % companies.length];
    const location = locations[i % locations.length];
    const remote = location.includes("Remote");
    
    // Randomize salary a bit
    const salaryMin = template.baseSalary + Math.floor(Math.random() * 10000);
    const salaryMax = salaryMin + 20000 + Math.floor(Math.random() * 30000);

    // Generate a realistic description
    const description = `We at ${company} are looking for a passionate ${template.title} to join our team in ${location}. You will be responsible for building cutting-edge solutions using ${template.skills.slice(0, 2).join(" and ")}. We offer competitive pay, great benefits, and a culture of innovation.`;

    // Random date within the last 30 days
    const postedDate = new Date();
    postedDate.setDate(postedDate.getDate() - Math.floor(Math.random() * 30));

    jobsToCreate.push({
      title: template.title,
      company,
      location,
      remote,
      salaryMin,
      salaryMax,
      description,
      skills: template.skills,
      postedDate,
    });
  }

  console.log("Inserting into Neon Database...");
  await prisma.job.createMany({
    data: jobsToCreate,
  });

  console.log("✅ Successfully seeded 300 jobs!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });