# OAuth Service - Technical Specification

## Project Overview

Build a production-ready OAuth 2.0 authentication service in TypeScript that supports:
- Authorization Code Flow
- Client Credentials Flow
- Refresh Token Flow
- Token introspection and revocation

## Architecture

### Technology Stack
- **Runtime**: Node.js 20+ with TypeScript 5.x
- **Framework**: Express.js with security middleware
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for token blacklisting and session management
- **Testing**: Jest with Supertest for integration tests
- **CI/CD**: GitHub Actions

### Project Structure
```
oauth-service-ts/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/     # Auth, validation, error handling
│   ├── models/         # Prisma schema and types
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic layer
│   ├── utils/          # Helpers and utilities
│   └── app.ts          # Express app setup
├── prisma/
│   └── schema.prisma   # Database schema
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # API integration tests
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### OAuth Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/authorize` | GET | Authorization page (Authorization Code flow) |
| `/oauth/token` | POST | Token endpoint (all flows) |
| `/oauth/revoke` | POST | Token revocation |
| `/oauth/introspect` | POST | Token introspection |

### Client Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/clients` | POST | Register OAuth client |
| `/clients/:id` | GET | Get client details |
| `/clients/:id` | DELETE | Remove client |

## Database Schema

### Clients Table
- id (UUID, primary key)
- name (string)
- client_id (string, unique)
- client_secret_hash (string, hashed)
- redirect_uris (JSON array)
- scopes (JSON array)
- created_at, updated_at

### Authorization Codes Table
- code (string, unique)
- client_id (FK)
- user_id (string)
- redirect_uri (string)
- scope (string)
- expires_at
- used (boolean)

### Tokens Table
- access_token (string, unique)
- refresh_token (string, unique)
- client_id (FK)
- user_id (string)
- scope (string)
- expires_at
- revoked (boolean)

## Security Requirements
- PKCE support for public clients
- JWT access tokens with RS256 signing
- Secure client secret storage (bcrypt hashing)
- Rate limiting on token endpoints
- CORS configuration
- Input validation with Zod

## Task Dependencies

```
tech-lead: Technical Specification (no dependencies)
    ↓
backend-dev: API Endpoints (depends on spec)
    ↓
frontend-dev: UI Components (depends on API structure)
    ↓
qa-engineer: Tests (depends on implementation)
    ↓
devops: CI/CD Pipeline (depends on tests passing)
```

## Deliverables
1. Technical specification document (this file)
2. Project scaffolding with TypeScript configuration
3. Database schema definitions
4. API implementation
5. Frontend UI for authorization flow
6. Test suite
7. CI/CD pipeline configuration