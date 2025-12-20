# Technical Standards (Common)

**⚠️ File Size Limit: Maximum 500 lines per file**

このファイルは一般的な技術標準とベストプラクティスを定義します。
プロジェクト固有の技術詳細については `tech.md` を参照してください。

**Note:** このファイルは 935 行あり、500 行制限を超えています。
以下のように分割する必要があります：
- `tech-development.md`: Architecture, Technology Stack, Testing
- `tech-operations.md`: API Design, Performance, Security, Error Handling, Logging, Code Quality, Documentation, CI/CD, Monitoring

## Architecture Patterns

### Three-Tier Architecture

**Recommended structure for web applications:**

```
┌─────────────────┐
│   Frontend      │  - React, Vue, or vanilla JS
│   (UI Layer)    │  - User interaction
└────────┬────────┘
         │
┌────────▼────────┐
│   Backend       │  - Node.js, Python, etc.
│   (API Layer)   │  - Business logic
└────────┬────────┘
         │
┌────────▼────────┐
│   Data Layer    │  - Database, Storage
│                 │  - External APIs
└─────────────────┘
```

**Benefits:**
- Clear separation of concerns
- Easier testing and maintenance
- Scalable architecture
- Independent deployment of layers

### Microservices vs Monolith

**When to use Monolith:**
- Small to medium projects
- Single team
- Rapid prototyping
- Limited resources

**When to use Microservices:**
- Large, complex systems
- Multiple teams
- Need for independent scaling
- Different technology stacks per service

**Recommendation:** Start with monolith, migrate to microservices when needed.

## Technology Stack Decisions

### Node.js Best Practices

**Version Management:**
- Use LTS versions (24.x or 22.x)
- Define in `.tool-versions` or `.nvmrc`
- Use `asdf` or `nvm` for version management

**Package Management:**
- Use `npm` or `yarn` consistently
- Lock dependencies with `package-lock.json` or `yarn.lock`
- Audit dependencies regularly: `npm audit`

**Code Organization:**
```
src/
├── index.ts           # Entry point
├── services/          # Business logic
├── types/             # TypeScript types
├── utils/             # Utility functions
└── config/            # Configuration
```

**Error Handling:**
```typescript
// ✅ Good: Specific error handling
try {
  const result = await fetchData();
  return result;
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    return fallbackData;
  }
  throw error; // Re-throw unknown errors
}

// ❌ Bad: Silent error swallowing
try {
  const result = await fetchData();
  return result;
} catch (error) {
  return null; // Lost error context
}
```

**Async/Await Best Practices:**
```typescript
// ✅ Good: Parallel execution
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts()
]);

// ❌ Bad: Sequential execution (slower)
const users = await fetchUsers();
const posts = await fetchPosts();
```

### TypeScript Best Practices

**Type Safety:**
```typescript
// ✅ Good: Explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetchUser(id);
}

// ❌ Bad: Any types
function getUser(id: any): Promise<any> {
  return fetchUser(id);
}
```

**Type Guards:**
```typescript
// ✅ Good: Type guard
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}

if (isUser(data)) {
  console.log(data.name); // Type-safe
}
```

**Utility Types:**
```typescript
// Partial: Make all properties optional
type PartialUser = Partial<User>;

// Pick: Select specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit: Exclude specific properties
type UserWithoutEmail = Omit<User, 'email'>;

// Record: Create object type with specific keys
type UserMap = Record<string, User>;
```

### React Best Practices

**Component Structure:**
```typescript
// ✅ Good: Functional component with hooks
import React, { useState, useEffect } from 'react';

interface Props {
  userId: string;
}

export const UserProfile: React.FC<Props> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
```

**State Management:**
```typescript
// ✅ Good: useState for local state
const [count, setCount] = useState(0);

// ✅ Good: useReducer for complex state
const [state, dispatch] = useReducer(reducer, initialState);

// ✅ Good: Context for global state
const ThemeContext = React.createContext<Theme>('light');
```

**Performance Optimization:**
```typescript
// ✅ Good: useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ✅ Good: useCallback for stable function references
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);

// ✅ Good: React.memo for component memoization
export const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
```

## Testing Strategies

### Unit Testing

**What to test:**
- Pure functions
- Business logic
- Utility functions
- Data transformations

**Example with Jest:**
```typescript
// sum.ts
export function sum(a: number, b: number): number {
  return a + b;
}

// sum.test.ts
import { sum } from './sum';

describe('sum', () => {
  it('should add two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('should handle negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3);
  });

  it('should handle zero', () => {
    expect(sum(0, 5)).toBe(5);
  });
});
```

**Best Practices:**
- Test one thing per test
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for 80%+ code coverage

### Integration Testing

**What to test:**
- API endpoints
- Database operations
- External service integrations
- Component interactions

**Example:**
```typescript
describe('User API', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('John');
  });
});
```

### E2E Testing

**What to test:**
- User workflows
- Critical paths
- Cross-browser compatibility
- Responsive design

**Example with Playwright:**
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('https://example.com/login');
  
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('https://example.com/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

**Best Practices:**
- Test critical user journeys
- Use Page Object Model pattern
- Run tests in CI/CD pipeline
- Test on multiple browsers
- Capture screenshots on failure

### Test Coverage Goals

**Recommended coverage:**
- Unit tests: 80-90%
- Integration tests: 60-70%
- E2E tests: Critical paths only

**Coverage is not everything:**
- Focus on testing behavior, not implementation
- Test edge cases and error paths
- Prioritize high-risk areas

## API Design

### RESTful API Best Practices

**Resource Naming:**
```
✅ Good:
GET    /api/users           # List users
GET    /api/users/123       # Get user
POST   /api/users           # Create user
PUT    /api/users/123       # Update user
DELETE /api/users/123       # Delete user

❌ Bad:
GET    /api/getUsers
POST   /api/createUser
GET    /api/user/get/123
```

**HTTP Status Codes:**
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Response Format:**
```typescript
// ✅ Good: Consistent response structure
{
  "data": {
    "id": "123",
    "name": "John"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// ✅ Good: Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

**Pagination:**
```typescript
// ✅ Good: Cursor-based pagination
{
  "data": [...],
  "pagination": {
    "nextCursor": "abc123",
    "hasMore": true
  }
}

// ✅ Good: Offset-based pagination
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### GraphQL Best Practices

**Schema Design:**
```graphql
# ✅ Good: Clear, descriptive types
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
}
```

**Resolver Best Practices:**
```typescript
// ✅ Good: DataLoader for batching
const userLoader = new DataLoader(async (ids) => {
  const users = await fetchUsersByIds(ids);
  return ids.map(id => users.find(u => u.id === id));
});

const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId)
  }
};
```

## Performance Optimization

### Frontend Performance

**Code Splitting:**
```typescript
// ✅ Good: Lazy loading
const Dashboard = React.lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

**Image Optimization:**
- Use WebP format when possible
- Implement lazy loading
- Use responsive images
- Compress images before upload

**Bundle Size:**
- Analyze bundle with `webpack-bundle-analyzer`
- Remove unused dependencies
- Use tree-shaking
- Split vendor bundles

### Backend Performance

**Database Optimization:**
```sql
-- ✅ Good: Use indexes
CREATE INDEX idx_users_email ON users(email);

-- ✅ Good: Limit results
SELECT * FROM users LIMIT 100;

-- ✅ Good: Use joins instead of N+1 queries
SELECT users.*, posts.title
FROM users
LEFT JOIN posts ON posts.user_id = users.id;
```

**Caching:**
```typescript
// ✅ Good: Cache frequently accessed data
const cache = new Map();

async function getUser(id: string): Promise<User> {
  if (cache.has(id)) {
    return cache.get(id);
  }
  
  const user = await fetchUser(id);
  cache.set(id, user);
  return user;
}
```

**Rate Limiting:**
```typescript
// ✅ Good: Implement rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Security Best Practices

### Input Validation

**Always validate user input:**
```typescript
// ✅ Good: Validate and sanitize
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
});

function createUser(input: unknown) {
  const validated = userSchema.parse(input);
  return saveUser(validated);
}
```

### Authentication & Authorization

**JWT Best Practices:**
```typescript
// ✅ Good: Short-lived tokens
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// ✅ Good: Verify tokens
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### SQL Injection Prevention

**Use parameterized queries:**
```typescript
// ✅ Good: Parameterized query
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ Bad: String concatenation
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### XSS Prevention

**Escape user input:**
```typescript
// ✅ Good: Use libraries that auto-escape
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
element.innerHTML = clean;

// ❌ Bad: Direct HTML injection
element.innerHTML = userInput;
```

## Error Handling

### Structured Error Handling

**Define error classes:**
```typescript
// ✅ Good: Custom error classes
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Usage
throw new ValidationError('Invalid email', 'email');
```

**Global error handler:**
```typescript
// ✅ Good: Centralized error handling
app.use((err, req, res, next) => {
  console.error(err);
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        field: err.field
      }
    });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.message
      }
    });
  }
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});
```

## Logging Best Practices

### Structured Logging

**Use structured logs:**
```typescript
// ✅ Good: Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});

// ❌ Bad: Unstructured logging
console.log(`User ${user.id} created at ${new Date()}`);
```

### Log Levels

**Use appropriate log levels:**
- `error`: Errors that need immediate attention
- `warn`: Warning messages
- `info`: General information
- `debug`: Detailed debugging information
- `trace`: Very detailed tracing information

**Example:**
```typescript
logger.error('Database connection failed', { error: err.message });
logger.warn('API rate limit approaching', { usage: 95 });
logger.info('User logged in', { userId: user.id });
logger.debug('Cache hit', { key: cacheKey });
```

## Code Quality

### Linting and Formatting

**ESLint Configuration:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

**Prettier Configuration:**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

### Code Review Checklist

**Before submitting PR:**
- [ ] Code follows project style guide
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Error handling implemented
- [ ] Security considerations addressed

**During code review:**
- [ ] Code is readable and maintainable
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Performance considerations
- [ ] Security vulnerabilities checked
- [ ] Tests are comprehensive

## Documentation

### Code Documentation

**JSDoc/TSDoc:**
```typescript
/**
 * Fetches user data from the API
 * 
 * @param userId - The unique identifier of the user
 * @returns A promise that resolves to the user object
 * @throws {NotFoundError} If the user does not exist
 * 
 * @example
 * ```typescript
 * const user = await fetchUser('123');
 * console.log(user.name);
 * ```
 */
async function fetchUser(userId: string): Promise<User> {
  const response = await api.get(`/users/${userId}`);
  if (!response.ok) {
    throw new NotFoundError(`User ${userId} not found`);
  }
  return response.json();
}
```

### README Structure

**Essential sections:**
1. Project title and description
2. Installation instructions
3. Usage examples
4. API documentation
5. Contributing guidelines
6. License

**Example:**
```markdown
# Project Name

Brief description of what the project does.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
import { fetchUser } from './api';

const user = await fetchUser('123');
\`\`\`

## API Documentation

See [API.md](./API.md) for detailed API documentation.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT
```

## Continuous Integration

### CI/CD Pipeline

**Recommended stages:**
1. **Lint**: Check code style
2. **Test**: Run unit and integration tests
3. **Build**: Compile/bundle code
4. **Security**: Run security scans
5. **Deploy**: Deploy to staging/production

**Example GitHub Actions:**
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '24'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### Pre-commit Hooks

**Use Husky for Git hooks:**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## Monitoring and Observability

### Application Monitoring

**Key metrics to track:**
- Response time
- Error rate
- Request rate
- CPU/Memory usage
- Database query performance

**Example with Prometheus:**
```typescript
import { Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path, res.statusCode)
      .observe(duration);
  });
  next();
});
```

### Error Tracking

**Use error tracking services:**
- Sentry
- Rollbar
- Bugsnag

**Example with Sentry:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.errorHandler());
```

## Conclusion

These technical standards provide a foundation for building high-quality, maintainable software. Adapt them to your project's specific needs while maintaining consistency across the codebase.

For project-specific technical details, see `tech.md`.
