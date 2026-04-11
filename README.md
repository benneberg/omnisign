# Cloudflare Workers Fullstack Chat App

[cloudflarebutton]

A production-ready fullstack chat application built on Cloudflare Workers. Features user management, chat boards with real-time messaging, and a modern React frontend with shadcn/ui. Leverages Durable Objects for efficient state management and indexing across entities.

## ✨ Key Features

- **Serverless Backend**: Hono-based API with Cloudflare Durable Objects for Users and ChatBoards
- **Entity Management**: Indexed entities for listing users/chats with automatic seeding
- **Real-time Chat**: Per-chat Durable Object instances storing messages
- **Modern UI**: React 18, Tailwind CSS, shadcn/ui components
- **Data Fetching**: Tanstack Query for optimistic updates and caching
- **Theme Support**: Light/dark mode with persistence
- **Error Handling**: Global error boundaries and client error reporting
- **Type-Safe**: Full TypeScript with shared types between frontend/backend
- **Production Optimized**: SSR assets handling, CORS, logging

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide React, Tanstack Query, React Router, Sonner (toasts), Framer Motion
- **Backend**: Cloudflare Workers, Hono, Durable Objects (GlobalDurableObject pattern)
- **State Management**: Durable Object storage with CAS for concurrency, Index entities for listing
- **Utilities**: Immer, Zod, clsx, tw-merge
- **Dev Tools**: Bun, Wrangler, ESLint, TypeScript

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Cloudflare Account](https://dash.cloudflare.com/) with Workers enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`bunx wrangler@latest`)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Login to Cloudflare:
   ```bash
   bunx wrangler login
   ```
4. Generate Worker types:
   ```bash
   bun run cf-typegen
   ```

### Development

Start the development server:
```bash
bun run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3000/api/health`
- Hot reload enabled for both frontend and Worker

**Available endpoints**:
- `GET /api/users` - List users
- `POST /api/users` - Create user `{ "name": "..." }`
- `GET /api/chats` - List chats
- `POST /api/chats` - Create chat `{ "title": "..." }`
- `GET /api/chats/:chatId/messages` - Get messages
- `POST /api/chats/:chatId/messages` - Send message `{ "userId": "...", "text": "..." }`

### Build & Preview

```bash
bun run build
bun run preview
```

## ☁️ Deployment

1. **Configure Wrangler** (edit `wrangler.jsonc` if needed):
   ```bash
   bunx wrangler secret put CLOUDFLARE_API_TOKEN  # Optional
   ```

2. Deploy to Cloudflare Workers:
   ```bash
   bun run deploy
   ```

3. Your app will be live at `https://<worker>.<subdomain>.workers.dev`

[cloudflarebutton]

**Custom Domain**: Bind via Cloudflare Dashboard > Workers > Your Worker > Triggers > Custom Domain.

## 🧪 Usage Examples

### Frontend API Calls (via `api-client.ts`)
```ts
import { api } from '@/lib/api-client'

// List users
const users = await api('/api/users')

// Create chat
const chat = await api('/api/chats', {
  method: 'POST',
  body: JSON.stringify({ title: 'My Chat' })
})

// Send message
const message = await api(`/api/chats/${chatId}/messages`, {
  method: 'POST',
  body: JSON.stringify({ userId: 'u1', text: 'Hello!' })
})
```

### Extending Entities
See `worker/entities.ts`:
1. Extend `IndexedEntity<S>` for new types
2. Add routes in `worker/user-routes.ts`
3. Use shared types in `shared/types.ts`

### Custom Routes
Add to `worker/user-routes.ts` and they auto-load.

## 🤝 Contributing

1. Fork & clone
2. `bun install`
3. Create feature branch
4. `bun run lint`
5. `bun run dev` & test
6. PR with clear description

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙌 Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [shadcn/ui](https://ui.shadcn.com/)

Built with ❤️ for Cloudflare Workers. Issues? Open a GitHub issue.