# CLAUDE.md - AI Assistant Guide for zuno-marketplace-event-stream

> **Last Updated**: 2025-11-15
> **Repository Status**: 🚧 Initial Setup / Empty Repository
> **Organization**: ZunoKit

---

## 📋 Table of Contents

1. [Repository Overview](#repository-overview)
2. [Current State](#current-state)
3. [Project Purpose & Architecture](#project-purpose--architecture)
4. [Development Workflow](#development-workflow)
5. [Code Conventions](#code-conventions)
6. [AI Assistant Guidelines](#ai-assistant-guidelines)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## 🔍 Repository Overview

**Repository**: `zuno-marketplace-event-stream`
**License**: MIT
**Organization**: ZunoKit

### ⚠️ Important Notice - Naming Discrepancy

There is currently a discrepancy between the repository name and README content:
- **Repository Name**: `zuno-marketplace-event-stream` (suggests an event streaming system)
- **README Content**: Describes `zuno-meme-live` (frontend for Live Meme platform)

**Action Required**: Before significant development, clarify the actual project purpose and update either:
1. The repository name to match the README, OR
2. The README to match the repository name

---

## 📊 Current State

### Repository Status: EMPTY/SKELETON

This repository was initialized on October 5, 2025, and currently contains only:

```
zuno-marketplace-event-stream/
├── .git/           # Git repository metadata
├── LICENSE         # MIT License (2025 Zuno Kit)
└── README.md       # Project description
```

### What's Missing

The repository currently lacks all standard project files:

**Configuration**:
- [ ] `package.json` or equivalent dependency management
- [ ] Build configuration (webpack, vite, rollup, etc.)
- [ ] `.gitignore`
- [ ] TypeScript/JavaScript configuration
- [ ] Linting/formatting configuration (.eslintrc, .prettierrc)
- [ ] Environment variable templates (.env.example)

**Source Code**:
- [ ] `src/` directory and source files
- [ ] Entry points (index.js, main.ts, etc.)
- [ ] Component/module structure

**Testing**:
- [ ] Test directory (`tests/`, `__tests__/`)
- [ ] Test configuration (jest, vitest, etc.)
- [ ] Test files

**DevOps**:
- [ ] CI/CD configuration (.github/workflows, etc.)
- [ ] Docker files (if containerized)
- [ ] Deployment scripts

---

## 🎯 Project Purpose & Architecture

### Potential Project Types (Based on Available Information)

#### Option 1: Event Streaming System (Based on Repo Name)
If this is `zuno-marketplace-event-stream`, the project likely:
- Handles real-time event streams for a marketplace
- Processes marketplace events (orders, listings, transactions)
- May use technologies like: Kafka, Redis Streams, WebSockets, Server-Sent Events
- Could be backend/infrastructure focused

#### Option 2: Live Meme Platform Frontend (Based on README)
If this is `zuno-meme-live`, the project likely:
- Frontend application for meme creation and sharing
- Includes "Meme Factory" for token creation
- Embeds via iframe into ZunoFun
- May use: React, Vue, or similar frontend framework
- Possible Web3/blockchain integration for token features

### Recommended Architecture (To Be Defined)

Once the project purpose is clarified, document the architecture here:
- Tech stack
- System design
- Data flow
- Integration points
- External dependencies

---

## 🛠️ Development Workflow

### Git Workflow

**Branch Strategy**:
- **Main Branch**: Production-ready code
- **Development Branch**: Integration branch (if using git-flow)
- **Feature Branches**: `feature/description` or `claude/task-description-{sessionId}`
- **Bug Fix Branches**: `fix/description`

**Current Branch**: `claude/create-codebase-documentation-01G2RPAeEAVARvXr6S2B6fqf`

### Commit Conventions

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `perf`: Performance improvements
- `ci`: CI/CD configuration changes

**Examples**:
```bash
feat(events): add event stream processor for marketplace orders
fix(websocket): resolve connection timeout issue
docs: update CLAUDE.md with project architecture
chore: initialize project structure with TypeScript
```

### Push/Pull Practices

**Pushing**:
```bash
git push -u origin <branch-name>
```
- Branch names must start with `claude/` and match session ID for AI assistant work
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) on network failures

**Pulling/Fetching**:
```bash
git fetch origin <branch-name>
git pull origin <branch-name>
```
- Prefer fetching specific branches
- Retry with exponential backoff on network failures

---

## 📝 Code Conventions

### General Principles

1. **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions/modules
2. **SOLID Principles**: Follow object-oriented design principles
3. **Separation of Concerns**: Keep business logic, presentation, and data access separate
4. **Error Handling**: Always handle errors gracefully with meaningful messages
5. **Security First**: Never commit secrets, validate all inputs, sanitize outputs

### Naming Conventions

**To be established based on project language/framework. Common patterns:**

**JavaScript/TypeScript**:
- Files: `kebab-case.ts` or `camelCase.ts`
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces (TS): `IPascalCase` or `PascalCase`
- Types (TS): `PascalCase`

**Example**:
```typescript
// Constants
const MAX_RETRY_ATTEMPTS = 3;

// Interface
interface IEventProcessor {
  processEvent(event: MarketplaceEvent): Promise<void>;
}

// Class
class EventStreamManager implements IEventProcessor {
  private connectionTimeout: number;

  async processEvent(event: MarketplaceEvent): Promise<void> {
    // Implementation
  }
}

// Function
function validateEventPayload(payload: unknown): boolean {
  // Implementation
}
```

### File Organization

**Recommended structure (to be created)**:

```
src/
├── components/        # UI components (if frontend)
├── services/          # Business logic services
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
├── config/           # Configuration files
├── api/              # API endpoints/clients
├── hooks/            # Custom hooks (if React)
├── stores/           # State management
└── tests/            # Unit and integration tests
    ├── unit/
    └── integration/

tests/
└── e2e/              # End-to-end tests
```

### Code Style

**To be enforced with linting tools**:
- Use ESLint for JavaScript/TypeScript
- Use Prettier for code formatting
- Configure pre-commit hooks to run linters

**Example .eslintrc.json (to be created)**:
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

---

## 🤖 AI Assistant Guidelines

### When Working on This Repository

#### 1. Initial Project Setup (CURRENT PHASE)

If setting up the project from scratch:

1. **Clarify Project Purpose**:
   - Ask the user to confirm whether this is an event streaming system or frontend application
   - Update README.md accordingly
   - Ensure repository name aligns with purpose

2. **Create Project Structure**:
   ```bash
   # Example for Node.js/TypeScript project
   npm init -y
   npm install --save-dev typescript @types/node
   npx tsc --init
   ```

3. **Add Essential Configuration Files**:
   - `.gitignore` (use appropriate template for the language/framework)
   - `tsconfig.json` or equivalent
   - `.eslintrc.json` and `.prettierrc`
   - `.env.example` with required environment variables
   - `package.json` with proper scripts

4. **Create Directory Structure**:
   - Set up `src/` directory
   - Add `tests/` directory
   - Create basic entry point file

5. **Update Documentation**:
   - Update this CLAUDE.md with actual architecture
   - Update README.md with setup instructions
   - Add inline code documentation

#### 2. Code Quality Checks

Before committing code, always:

- [ ] Run linter and fix all issues
- [ ] Run tests and ensure all pass
- [ ] Check for security vulnerabilities (no hardcoded secrets, proper input validation)
- [ ] Verify no sensitive data in commits
- [ ] Ensure code follows established conventions
- [ ] Add/update tests for new functionality
- [ ] Update documentation if needed

#### 3. Security Best Practices

**NEVER**:
- Commit secrets, API keys, passwords, or tokens
- Expose sensitive user data
- Skip input validation
- Use `eval()` or similar dangerous functions
- Disable security features without documentation

**ALWAYS**:
- Validate and sanitize all user inputs
- Use environment variables for configuration
- Implement proper error handling
- Follow OWASP Top 10 guidelines
- Use secure dependencies (check for vulnerabilities)

**Common Vulnerabilities to Avoid**:
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Command Injection
- Path Traversal
- Insecure Deserialization
- Insufficient Logging & Monitoring

#### 4. Testing Requirements

Write tests for:
- All new features
- Bug fixes (regression tests)
- Critical business logic
- API endpoints
- Utility functions

**Test Coverage Goals**:
- Aim for >80% code coverage
- 100% coverage for critical paths
- Edge cases and error conditions

#### 5. Documentation Standards

**Code Documentation**:
```typescript
/**
 * Processes marketplace events from the event stream
 *
 * @param event - The marketplace event to process
 * @param options - Processing options
 * @returns Promise resolving to processing result
 * @throws {ValidationError} If event payload is invalid
 * @throws {ProcessingError} If event processing fails
 *
 * @example
 * ```typescript
 * const result = await processMarketplaceEvent(event, {
 *   retryOnFailure: true,
 *   maxRetries: 3
 * });
 * ```
 */
async function processMarketplaceEvent(
  event: MarketplaceEvent,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  // Implementation
}
```

**Update This File**:
- When architecture changes significantly
- When new patterns or conventions are adopted
- When adding major features
- After project setup is complete

#### 6. Performance Considerations

- Use appropriate data structures
- Implement caching where beneficial
- Avoid N+1 queries
- Use connection pooling for databases
- Implement rate limiting for APIs
- Monitor memory usage
- Profile performance-critical code

#### 7. Error Handling Patterns

```typescript
// Good: Specific error handling
try {
  const result = await processEvent(event);
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Invalid event payload', { error, event });
    return { status: 'skipped', reason: 'invalid_payload' };
  }

  if (error instanceof RetryableError) {
    logger.info('Retryable error, queuing for retry', { error, event });
    await queueForRetry(event);
    return { status: 'retry_queued' };
  }

  logger.error('Unexpected error processing event', { error, event });
  throw error;
}
```

---

## 🔧 Common Tasks

### Initial Project Setup

```bash
# 1. Clone the repository (if not already cloned)
git clone <repository-url>
cd zuno-marketplace-event-stream

# 2. Check out the development branch
git checkout -b develop-claude

# 3. Initialize project (example for Node.js)
npm init -y

# 4. Install dependencies
npm install <required-packages>

# 5. Create .gitignore
cat > .gitignore << EOF
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
coverage/
EOF

# 6. Create basic structure
mkdir -p src/{components,services,utils,types,config}
mkdir -p tests/{unit,integration,e2e}

# 7. Commit initial structure
git add .
git commit -m "chore: initialize project structure"
git push -u origin develop-claude
```

### Adding a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Implement feature with tests
# ... develop code ...

# 3. Run tests
npm test

# 4. Run linter
npm run lint

# 5. Commit changes
git add .
git commit -m "feat(scope): description of feature"

# 6. Push to remote
git push -u origin feature/your-feature-name
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Building the Project

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Watch mode for development
npm run dev
```

---

## 🐛 Troubleshooting

### Common Issues

#### Git Push Fails with 403

**Issue**: Branch name doesn't follow required pattern for AI assistants.

**Solution**: Ensure branch starts with `claude/` and ends with session ID:
```bash
git checkout -b claude/feature-description-{sessionId}
```

#### Network Failures on Git Operations

**Solution**: Implemented automatic retry with exponential backoff (2s, 4s, 8s, 16s).

#### Build Failures

1. Clear dependency cache: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist/ build/`
3. Check Node.js version matches project requirements
4. Verify all environment variables are set

#### Test Failures

1. Ensure test database is running (if applicable)
2. Check environment variables in test environment
3. Clear test cache: `npm test -- --clearCache`
4. Run tests in isolation: `npm test -- --runInBand`

---

## 📚 Additional Resources

### Internal Documentation

- README.md - Project overview and setup instructions
- LICENSE - MIT License terms
- (To be added) API.md - API documentation
- (To be added) CONTRIBUTING.md - Contribution guidelines
- (To be added) CHANGELOG.md - Version history

### External Resources

**To be added based on actual tech stack**:
- Framework documentation
- Language documentation
- Best practices guides
- Design patterns

---

## 🔄 Maintenance

### Regular Updates Required

This document should be updated when:
- [ ] Project purpose is clarified and initial setup is complete
- [ ] Technology stack is chosen and implemented
- [ ] Architecture patterns are established
- [ ] New conventions are adopted
- [ ] Major features are added
- [ ] Development workflow changes

### Update Checklist

When updating this file:
1. Update the "Last Updated" date at the top
2. Add changes to relevant sections
3. Update examples if conventions change
4. Verify all links still work
5. Remove "To be added" placeholders as content is created
6. Keep the Table of Contents in sync

---

## 📞 Getting Help

### For AI Assistants

1. **Check this file first** for conventions and patterns
2. **Read the README.md** for project overview
3. **Examine existing code** for patterns and style
4. **Run tests** to understand expected behavior
5. **Ask the user** if requirements are unclear

### For Developers

- Review this CLAUDE.md for AI collaboration guidelines
- Check README.md for project setup
- Refer to CONTRIBUTING.md (when created) for contribution process
- Contact repository maintainers for architecture questions

---

**Version**: 1.0.0 (Initial draft for empty repository)
**Status**: 🚧 Awaiting project initialization and purpose clarification
