# ILAL Landing & API Portal

ILAL official website and API Portal (developer control panel).

## Features

### Landing Page
- Product introduction and technical overview
- Project roadmap
- Integration guides

### API Portal (Dashboard)
- User registration and login (invite-only)
- API Key management (create, copy, revoke)
- Usage statistics and quota monitoring
- API documentation

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` to configure the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For production:

```env
NEXT_PUBLIC_API_URL=https://api.ilal.tech
```

### 3. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
landing/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth pages group
│   │   ├── login/              # Login page
│   │   └── register/           # Register page (with invite code)
│   ├── dashboard/              # Dashboard (requires auth)
│   │   ├── page.tsx           # Main control panel
│   │   ├── api-keys/          # API Key management
│   │   ├── usage/             # Usage statistics
│   │   └── settings/          # Account settings
│   ├── docs/                   # API documentation
│   │   ├── quickstart/        # Quick start
│   │   ├── authentication/    # Authentication docs
│   │   └── endpoints/         # API endpoints
│   ├── about/                  # About page
│   ├── technology/             # Technology overview
│   ├── integrations/           # Integration guides
│   └── roadmap/               # Roadmap
├── components/
│   ├── UserMenu.tsx           # User menu
│   └── dashboard/             # Dashboard components
│       ├── Sidebar.tsx
│       ├── ApiKeyCard.tsx
│       ├── CreateApiKeyDialog.tsx
│       └── UsageChart.tsx
├── lib/
│   ├── api.ts                 # API call wrapper
│   ├── auth.ts                # Auth utilities
│   └── utils.ts               # General utilities
├── contexts/
│   └── AuthContext.tsx        # Global auth state
└── hooks/
    └── useAuth.ts             # Auth hook
```

## Invite System

Registration uses a fixed invite code system (Beta testing phase).

### Valid Invite Codes

Configured in `app/(auth)/register/page.tsx`:

```typescript
const VALID_INVITE_CODES = ['ILAL-BETA-2026', 'ILAL-EARLY-ACCESS'];
```

### Adding New Invite Codes

Edit `app/(auth)/register/page.tsx` and add new codes to the `VALID_INVITE_CODES` array.

### Disabling Invite System

Set `showInviteCode` to `false` in `app/(auth)/register/page.tsx`:

```typescript
const [showInviteCode, setShowInviteCode] = useState(false);
```

## API Integration

The API Portal depends on the backend service `apps/api`. Make sure the backend is running with CORS properly configured.

### CORS Configuration

The backend must allow cross-origin requests from the Landing domain:

```javascript
// apps/api/src/index.ts
app.use(cors({
  origin: ['http://localhost:3000', 'https://ilal.tech'],
  credentials: true
}));
```

## Deployment

### Vercel Deployment (Recommended)

1. Connect your Git repository to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: API service URL
3. Deploy

### Environment Variables (Production)

```env
NEXT_PUBLIC_API_URL=https://api.ilal.tech
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Notifications**: react-hot-toast
- **HTTP Client**: fetch API
- **Form Validation**: Zod

## Development Guide

### Adding New Pages

1. Create a new folder under `app/`
2. Add `page.tsx`
3. (Optional) Add `layout.tsx`

### Adding New API Endpoints

Add new API call functions in `lib/api.ts`:

```typescript
export async function newApiCall(token: string, params: any) {
  const res = await fetch(`${API_URL}/api/v1/new-endpoint`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    throw new Error('API call failed');
  }
  
  return res.json();
}
```

## License

MIT
