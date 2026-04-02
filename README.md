# PlanAI

Consolidate all your calendars into one smart, AI-powered schedule.

## Features

- **Multi-Calendar Integration**: Connect Google Calendar, Outlook, Blackboard, Moodle, Canvas, and any iCal feed
- **Unified Calendar View**: See all your events in one place with color-coded sources
- **AI Schedule Optimization**: LLM-powered scheduling that creates optimal study/work blocks
- **Task Complexity Analysis**: AI estimates how long tasks will take based on content and context
- **Conversational AI**: Chat with an AI assistant to manage and customize your schedule
- **Webhooks & Sync**: Real-time updates via webhooks for Google/Outlook, polling for LMS
- **LLM-Guided Scraping**: AI generates scraping steps to extract data from LMS platforms
- **Mobile PWA**: Install on your phone as a progressive web app
- **Vercel Ready**: Optimized for deployment on Vercel

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (Google OAuth)
- **AI**: OpenAI GPT-4o via Vercel AI SDK
- **UI**: Tailwind CSS, Radix UI, shadcn/ui components
- **Calendar**: FullCalendar
- **State**: Zustand
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database ([Vercel Postgres](https://vercel.com/storage/postgres) or [Neon](https://neon.tech))
- OpenAI API key
- Google OAuth credentials (optional, for Google Calendar)

### Setup

1. **Clone and install**:
   ```bash
   cd PlanAI
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your credentials.

3. **Set up database**:
   ```bash
   npx prisma db push
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── calendars/     # Calendar CRUD & sync
│   │   ├── chat/          # AI chat (streaming)
│   │   ├── events/        # Unified events API
│   │   ├── schedule/      # AI schedule generation
│   │   ├── scrape/        # LLM-guided scraping
│   │   └── webhooks/      # Google & Outlook webhooks
│   ├── dashboard/         # Dashboard page
│   ├── calendar/          # Calendar view page
│   ├── connect/           # Connect services page
│   ├── chat/              # Full-page AI chat
│   └── settings/          # User preferences
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   ├── CalendarView      # FullCalendar wrapper
│   ├── ChatInterface     # Floating AI chat
│   ├── ConnectServiceCard # Service connection cards
│   ├── EventCard         # Event display card
│   ├── Navigation        # App navigation
│   ├── ScheduleSuggestions # AI schedule suggestions
│   └── TaskComplexity    # Task analysis display
├── lib/                   # Utilities & services
│   ├── auth.ts           # NextAuth config
│   ├── calendar-sync.ts  # Calendar sync logic
│   ├── openai.ts         # AI/LLM functions
│   ├── prisma.ts         # Database client
│   ├── schedule-optimizer # Schedule generation
│   ├── scraper.ts        # Web scraping
│   ├── store.ts          # Zustand state
│   └── utils.ts          # Helpers
├── types/                 # TypeScript types
└── prisma/               # Database schema
```

## Calendar Integration Details

| Service | Method | Real-time |
|---------|--------|-----------|
| Google Calendar | OAuth + API | Webhooks |
| Outlook/O365 | OAuth + Graph API | Webhooks |
| Blackboard | iCal feed / Scraping | Polling |
| Moodle | Web service API / Scraping | Polling |
| Canvas | REST API / iCal | Polling |
| Any iCal | ICS URL | Polling |

## AI Features

### Task Complexity Analysis
The AI analyzes each task based on:
- Task title and description content
- Assignment type (essay, exam, coding, etc.)
- Time until due date
- Course/subject context

### Schedule Optimization
The AI creates study schedules considering:
- Task priorities and deadlines
- Estimated completion times
- Existing calendar events
- User's preferred study hours
- Break intervals

### Conversational Interface
Chat with the AI to:
- Get schedule suggestions
- Modify events and preferences
- Ask about upcoming deadlines
- Get study tips and strategies

## License

MIT
