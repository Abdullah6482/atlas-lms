import { asc } from "drizzle-orm";
import { getDb } from "../../db";
import { assignments, courses, lessons, modules, quizQuestions, quizzes } from "../../db/schema";

export async function ensureCurriculum() {
  const db = getDb();
  const present = await db.select({ id: courses.id }).from(courses).limit(1);
  if (present.length) return db;

  const seeded = await db.insert(courses).values([
    { slug: "product-design-systems", title: "Product Design Systems", description: "Build coherent product experiences through tokens, components, governance, and thoughtful critique.", category: "Design", level: "Intermediate", duration: "6 weeks", instructor: "Mira Chen", color: "#d9d2ff", accent: "#6f5fe7", published: true },
    { slug: "modern-react-architecture", title: "Modern React Architecture", description: "Design resilient frontends with composition, server boundaries, testing, and performance in mind.", category: "Development", level: "Advanced", duration: "8 weeks", instructor: "Jon Bell", color: "#c7f0e2", accent: "#127c62", published: true },
    { slug: "data-storytelling", title: "Data Storytelling", description: "Turn complex analysis into clear narratives, persuasive dashboards, and decisions people understand.", category: "Data", level: "Beginner", duration: "4 weeks", instructor: "Nadia Rao", color: "#ffd8bd", accent: "#d65b2b", published: true },
    { slug: "creative-leadership", title: "Creative Leadership", description: "Lead ambitious teams with clarity, better feedback, practical rituals, and sustainable momentum.", category: "Business", level: "Intermediate", duration: "5 weeks", instructor: "Elias Ford", color: "#cfe4ff", accent: "#326bc4", published: true },
  ]).returning();

  const moduleDefinitions = [
    ["Foundations", "Systems in practice"], ["Architecture foundations", "Shipping with confidence"], ["Find the signal", "Shape the story"], ["Lead the work", "Grow the team"],
  ];
  const lessonDefinitions = [
    [["Why systems matter", "Understand the leverage and language of design systems.", "A design system is not a component library. It is a shared language connecting decisions, tools, and teams. In this lesson, you will map the forces that make a system valuable and identify where consistency creates genuine leverage."], ["Tokens as decisions", "Translate visual choices into durable foundations.", "Tokens capture decisions in a form products can share. Learn how color, type, space, and motion become a coherent source of truth rather than a brittle catalogue of values."], ["Component anatomy", "Design components that stay flexible without losing intent.", "Good components balance strong defaults with deliberate extension points. We will examine anatomy, states, variants, accessibility, and the documentation that makes reuse possible."], ["Governance and adoption", "Create a system teams choose to use.", "Systems thrive through trust. Build contribution paths, decision records, release rhythms, and feedback loops that turn a library into an evolving product."]],
    [["Thinking in boundaries", "Find the seams that make interfaces resilient.", "Architecture becomes useful when boundaries clarify ownership. Explore rendering, data, state, and feature boundaries through practical React examples."], ["Composition over configuration", "Build flexible interfaces from small, clear contracts.", "Composition lets teams add capability without expanding configuration endlessly. Learn slot patterns, compound components, and focused hooks."], ["Server and client", "Place work on the right side of the boundary.", "Understand server rendering, client interactivity, cache behavior, and how to minimize JavaScript without compromising experience."], ["Testing the contract", "Protect behavior while keeping refactors possible.", "Effective tests focus on observable contracts. Design a layered strategy using unit, integration, and browser coverage."]],
    [["Audience before charts", "Start with the people and decision, not the visualization.", "Every useful data story begins with an audience, a decision, and the friction between today and a better outcome."], ["Choose the evidence", "Select metrics that illuminate rather than decorate.", "Learn how to distinguish signal from noise and build a sequence of evidence that earns the conclusion."], ["Visual hierarchy", "Direct attention with contrast, order, and restraint.", "Good dashboards make the next question obvious. Use hierarchy and annotation to build a guided reading experience."], ["Present the decision", "Close with an action people can take.", "A narrative is incomplete without a next step. Frame recommendations with context, tradeoffs, and confidence."]],
    [["Clarity as a practice", "Turn direction into decisions teams can use.", "Leadership clarity is made through repeated decisions, not inspiring language alone. Learn to connect principles to everyday tradeoffs."], ["Better critique", "Make feedback specific, candid, and generative.", "Critique should improve the work and the team's ability to make it. Practice framing, inquiry, and actionable feedback."], ["Rituals for momentum", "Design recurring moments that reduce coordination cost.", "The right rituals make progress visible and decisions timely. Audit meetings, reviews, planning, and reflection."], ["Developing others", "Grow capability through stretch, support, and trust.", "Move beyond delegation toward development. Match challenge with context, feedback, and room for ownership."]],
  ];

  for (let c = 0; c < seeded.length; c++) {
    const createdModules = await db.insert(modules).values(moduleDefinitions[c].map((title, index) => ({ courseId: seeded[c].id, title, position: index + 1 }))).returning();
    for (let i = 0; i < createdModules.length; i++) {
      const sourceLessons = lessonDefinitions[c].slice(i * 2, i * 2 + 2);
      await db.insert(lessons).values(sourceLessons.map((lesson, index) => ({ moduleId: createdModules[i].id, title: lesson[0], summary: lesson[1], content: lesson[2], durationMinutes: 8 + ((c + i + index) % 4) * 3, position: index + 1 })));
    }
  }

  const [quiz] = await db.insert(quizzes).values({ courseId: seeded[0].id, title: "Design systems checkpoint", passingScore: 70 }).returning();
  await db.insert(quizQuestions).values([
    { quizId: quiz.id, prompt: "What is the strongest definition of a design system?", optionsJson: JSON.stringify(["A Figma file", "A shared language of decisions, tools, and practices", "A CSS framework", "A brand guideline PDF"]), correctIndex: 1 },
    { quizId: quiz.id, prompt: "What makes a component easier to adopt?", optionsJson: JSON.stringify(["Unlimited variants", "No documentation", "Strong defaults and deliberate extension points", "A single fixed layout"]), correctIndex: 2 },
    { quizId: quiz.id, prompt: "Which practice supports long-term governance?", optionsJson: JSON.stringify(["Hidden decisions", "Contribution paths and release rhythms", "One permanent owner", "Avoiding feedback"]), correctIndex: 1 },
  ]);
  await db.insert(assignments).values([
    { courseId: seeded[0].id, title: "Audit a product interface", brief: "Identify repeated patterns, inconsistencies, and three opportunities where a shared system would improve quality or speed.", dueLabel: "Due Friday", points: 100 },
    { courseId: seeded[1].id, title: "Map an application boundary", brief: "Choose a React feature and explain its data, rendering, state, and ownership boundaries in a short architecture note.", dueLabel: "Due in 6 days", points: 100 },
    { courseId: seeded[2].id, title: "Rewrite a dashboard narrative", brief: "Take a dashboard you know and propose a clearer sequence from context to evidence to decision.", dueLabel: "Due next week", points: 80 },
  ]);
  return db;
}

export async function curriculumRows() {
  const db = await ensureCurriculum();
  return {
    courses: await db.select().from(courses).orderBy(asc(courses.id)),
    modules: await db.select().from(modules).orderBy(asc(modules.position)),
    lessons: await db.select().from(lessons).orderBy(asc(lessons.position)),
    quizzes: await db.select().from(quizzes),
    questions: await db.select().from(quizQuestions).orderBy(asc(quizQuestions.id)),
    assignments: await db.select().from(assignments).orderBy(asc(assignments.id)),
  };
}
