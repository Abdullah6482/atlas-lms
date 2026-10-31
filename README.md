<div align="center">
  <img src="screenshots/atlas-lms-overview.png" alt="Atlas Learning learner dashboard" width="100%" />
  <h1>Atlas Learning</h1>
  <p><strong>A calmer way to learn, one thoughtful step at a time.</strong></p>
  <p>A full-stack learning management system with a focused learner workspace and an instructor course studio.</p>
</div>

---

## At a glance

Atlas Learning brings courses, lessons, knowledge checks, assignments, and teaching tools into one cohesive experience. Learners can find a course, follow a structured curriculum, track progress, and submit work. Instructors can create courses, publish drafts, and review activity metrics.

| Learner workspace | Instructor studio |
| --- | --- |
| Course catalogue and category discovery | Course portfolio and publication status |
| Enrolments, modules, lessons, and progress | Create a course with a starter module and lesson |
| Knowledge checks with automatic scoring | Publish and unpublish courses |
| Assignment briefs and written submissions | Enrolment, quiz-attempt, and submission metrics |

The interface is responsive and includes a dedicated mobile layout. The [screenshots](screenshots/task-6-atlas-lms/README.md) show the complete Task 6 walkthrough.

## Product tour

<details open>
  <summary><strong>01 — Learner home</strong></summary>
  <br />
  <img src="screenshots/task-6-atlas-lms/01-learner-dashboard-overview.png" alt="Learner dashboard with course progress and next actions" width="100%" />
</details>

<details>
  <summary><strong>02 — Explore courses and curriculum</strong></summary>
  <br />
  <img src="screenshots/task-6-atlas-lms/03-course-catalogue.png" alt="Course catalogue" width="49%" />
  <img src="screenshots/task-6-atlas-lms/05-course-details-and-curriculum.png" alt="Course details and curriculum" width="49%" />
</details>

<details>
  <summary><strong>03 — Learn and check understanding</strong></summary>
  <br />
  <img src="screenshots/task-6-atlas-lms/07-lesson-content-and-reflection.png" alt="Lesson content and reflection" width="49%" />
  <img src="screenshots/task-6-atlas-lms/11-knowledge-check-score.png" alt="Knowledge check score and feedback" width="49%" />
</details>

<details>
  <summary><strong>04 — Submit an assignment</strong></summary>
  <br />
  <img src="screenshots/task-6-atlas-lms/13-assignment-brief-and-response.png" alt="Assignment brief and response form" width="49%" />
  <img src="screenshots/task-6-atlas-lms/16-submitted-assignment-status.png" alt="Submitted assignment status" width="49%" />
</details>

<details>
  <summary><strong>05 — Build and publish a course</strong></summary>
  <br />
  <img src="screenshots/task-6-atlas-lms/17-instructor-studio-overview.png" alt="Instructor studio overview" width="49%" />
  <img src="screenshots/task-6-atlas-lms/20-course-published.png" alt="Published course in the instructor studio" width="49%" />
</details>

## Built with

- **React 19** and **TypeScript**
- **Vinext** with a Next-compatible App Router and **Vite**
- **Tailwind CSS 4**
- **Cloudflare Workers** and **D1**
- **Drizzle ORM**
- **ChatGPT Sites** identity headers when hosted in its authenticated environment

The API is organized around learner dashboard actions and instructor course management:

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/dashboard` | `GET`, `POST` | Load learner data; enrol, complete lessons, submit quizzes, and submit assignments |
| `/api/instructor` | `GET`, `POST`, `PUT`, `DELETE` | Read teaching metrics, create courses, publish or unpublish, and delete courses |

## Run locally

### Requirements

- Node.js **22.13 or newer**
- npm

### Install and start

```bash
git clone https://github.com/Abdullah6482/atlas-lms.git
cd atlas-lms
npm install
```

The host-specific `.openai/hosting.json` is intentionally not tracked. Create the local file from the safe template before starting the app:

```powershell
New-Item -ItemType Directory -Force .openai | Out-Null
Copy-Item .openai/hosting.example.json .openai/hosting.json
```

Then start the development server:

```bash
npm run dev
```

Vite runs the app with local Cloudflare bindings. On an empty database, the app initializes fictional course content for the demo. Local runtime and D1 state belong in `.wrangler/` and are excluded from Git. The `start` script serves a production build locally; run `npm run build` first.

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create the production build |
| `npm run start` | Serve the built app with local Wrangler state |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations from the schema |

## Identity and demo data

In its hosted ChatGPT Sites environment, the app reads the platform-provided `oai-authenticated-user-*` request headers. The current local fallback is a fixed demo learner (`local-demo-learner`, `learner@atlas.local`); it is for previewing the interface, **not authentication**. The project does not include a standalone sign-in flow or role-based instructor authorization. Do not expose a deployment to real users without integrating and enforcing trusted authentication and authorization at the hosting boundary.

Course catalogue content and initial learner activity are fictional seed data. The screenshots also include synthetic local demo interactions, including a quiz attempt, assignment response, and instructor-created course. They do not depict a real account, production database, or live deployment. No local D1 database or runtime state is included in this repository.

## Project structure

```text
app/
  api/                 Learner and instructor API routes
  page.tsx             Learning workspace and instructor studio
  chatgpt-auth.ts      Hosted identity-header helpers
db/                    Drizzle schema and D1 binding
drizzle/               SQL migrations and schema snapshots
lib/                   Connector contracts and shared helpers
public/                Static assets
screenshots/            Product overview and Task 6 evidence
worker/                 Cloudflare Worker entry point
```

## Project context

Built for **Task 6 — Learning Management System (Advanced)** as part of the Auspify Technologies Full Stack Development internship. Atlas Learning is an educational project and is not presented as a deployed commercial service.
