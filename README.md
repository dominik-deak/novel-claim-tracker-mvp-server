# Claim Tracker Backend

Backend API for the Novel Claim Tracker MVP - a full-stack application for managing UK R&D tax relief claims and projects.

## 📋 Overview

This backend provides a REST API built on AWS serverless infrastructure (Lambda + DynamoDB + API Gateway) for managing R&D tax relief claims and associated projects. The system supports a **many-to-many relationship** between claims and projects, reflecting real-world UK R&D tax relief practices where projects often span multiple accounting periods.

**Key Features:**
- CRUD operations for Claims and Projects
- Many-to-many relationship management via junction table
- Role-based access control
- Input validation with Zod schemas
- Comprehensive error handling
- Mock server for local development
- Infrastructure as Code with AWS CDK

## 🏗️ Architecture

### Design Decisions

**1. Three-Table Design**
We chose a normalized three-table approach over single-table design for:
- **Clarity**: Easier to understand and maintain for an MVP
- **Flexibility**: Simple to add GSIs and modify access patterns later
- **Extensibility**: Straightforward to add new relationships

**Tables:**
- `Claims` - Stores claim metadata (company, period, amount, status)
- `Projects` - Stores project metadata (name, description)
- `ClaimProjects` - Junction table implementing many-to-many relationship with GSI for reverse lookups

**2. Amount Storage in Pence**
All monetary values are stored as integers (pence) to avoid floating-point precision issues:
- £500.00 = 50000 pence
- £1,234.56 = 123456 pence

**3. ISO 8601 Date Format**
All dates use ISO 8601 strings for consistency:
- Date only: `"2024-01-01"`
- Timestamps: `"2024-01-01T12:00:00.000Z"`

**4. Partition Key Prefixes**
DynamoDB keys use prefixes for clarity and to enable future single-table patterns:
- `CLAIM#<uuid>` - Claim partition keys
- `PROJECT#<uuid>` - Project partition keys

### DynamoDB Schema

#### Claims Table
```typescript
{
  PK: "CLAIM#<uuid>",           // Partition Key
  SK: "METADATA",                // Sort Key
  claimId: string,               // uuid v4
  companyName: string,
  claimPeriod: {
    startDate: string,           // ISO 8601
    endDate: string
  },
  amount: number,                // In pence
  status: "Draft" | "Submitted" | "Approved",
  userId: string | null,
  submittedBy: string | null,
  reviewedBy: string | null,
  submittedAt: string | null,
  reviewedAt: string | null,
  createdAt: string,
  updatedAt: string
}
```

#### Projects Table
```typescript
{
  PK: "PROJECT#<uuid>",
  SK: "METADATA",
  projectId: string,
  name: string,
  description: string,
  userId: string | null,
  createdAt: string,
  updatedAt: string
}
```

#### ClaimProjects Table (Junction)
```typescript
{
  PK: "CLAIM#<claimId>",
  SK: "PROJECT#<projectId>",
  addedAt: string
}

// GSI: projectId-index
// PK: SK (PROJECT#<projectId>)
// SK: PK (CLAIM#<claimId>)
// Purpose: Query all claims for a given project
```

## 🛠️ Technology Stack

- **Runtime**: Node.js, TypeScript
- **Infrastructure**: AWS CDK
- **Services**: AWS Lambda, DynamoDB, API Gateway
- **Validation**: Zod
- **Testing**: Jest
- **Code Quality**: Biome (linting/formatting), Husky (git hooks)
- **Local Development**: Express-based mock server

## 📁 Project Structure

```
backend/
├── bin/
│   └── claim-tracker.ts          # CDK app entry point
├── lib/
│   └── claim-tracker-stack.ts    # CDK infrastructure definition
├── src/
│   ├── functions/
│   │   ├── claims/               # Claim Lambda handlers
│   │   │   ├── create.ts
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   └── linkProjects.ts
│   │   └── projects/             # Project Lambda handlers
│   │       ├── create.ts
│   │       ├── list.ts
│   │       ├── get.ts
│   │       ├── update.ts
│   │       └── delete.ts
│   ├── shared/
│   │   ├── auth.ts               # Authentication helpers
│   │   ├── db.ts                 # DynamoDB utilities
│   │   ├── responses.ts          # HTTP response helpers
│   │   ├── schemas.ts            # Zod validation schemas
│   │   ├── types.ts              # TypeScript types
│   │   └── utils.ts              # Utility functions
│   └── mock-server/
│       └── index.ts              # Express mock server
└── test/
    ├── claims.test.ts            # Claim endpoint tests
    ├── projects.test.ts          # Project endpoint tests
    ├── db.test.ts                # Database helper tests
    ├── auth.test.ts              # Auth helper tests
    └── utils.test.ts             # Utility tests
```

## 🚀 Local Development

### Prerequisites

- Node.js v24
- AWS CLI configured (for deployment only)

### Installation

```bash
# Use Node.js v24 (via nvm)
nvm use

# Install dependencies
npm install

# Copy environment variables (optional for mock server)
cp .env.example .env
```

### Running the Mock Server

For local frontend development without AWS deployment:

```bash
npm run dev:mock
```

The mock server runs on `http://localhost:3001` and provides all API endpoints with in-memory storage.

### Code Quality Commands

```bash
# Format code
npm run format:check       # Check formatting
npm run format:fix         # Auto-fix formatting issues

# Linting
npm run lint:check         # Check for linting issues
npm run lint:fix           # Auto-fix linting issues

# Type checking
npm run type-check         # Run TypeScript type checking

# Security
npm run audit              # Run npm security audit
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🌐 API Documentation

### Base URL
- **Local (Mock)**: `http://localhost:3001`
- **Production**: `https://<api-id>.execute-api.eu-west-2.amazonaws.com/prod`

### Authentication
API currently uses `X-User-Id` header for user identification.

### Endpoints

#### Claims

**Create Claim**
```http
POST /claims
Content-Type: application/json

{
  "companyName": "Acme Corp",
  "claimPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "amount": 50000,
  "projectIds": ["project-uuid-1", "project-uuid-2"]
}

Response: 201 Created
{
  "claim": {
    "claimId": "claim-uuid",
    "companyName": "Acme Corp",
    "claimPeriod": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
    "amount": 50000,
    "status": "Draft",
    "projects": [...],
    "createdAt": "2024-11-12T10:00:00.000Z",
    "updatedAt": "2024-11-12T10:00:00.000Z"
  }
}
```

**List Claims**
```http
GET /claims
GET /claims?status=Draft

Response: 200 OK
{
  "claims": [...]
}
```

**Get Single Claim**
```http
GET /claims/:id

Response: 200 OK
{
  "claim": {
    "claimId": "claim-uuid",
    "companyName": "Acme Corp",
    "projects": [
      {
        "projectId": "project-uuid-1",
        "name": "AI Algorithm Development",
        "description": "..."
      }
    ],
    ...
  }
}
```

**Update Claim**
```http
PATCH /claims/:id
Content-Type: application/json

{
  "status": "Submitted"
}

Response: 200 OK
{
  "claim": {...}
}
```

**Delete Claim**
```http
DELETE /claims/:id

Response: 204 No Content
(No response body)
```

**Link Projects to Claim**
```http
POST /claims/:id/projects
Content-Type: application/json

{
  "projectIds": ["project-uuid-3"]
}

Response: 200 OK
{
  "message": "Projects linked successfully"
}
```

**Unlink Project from Claim**
```http
DELETE /claims/:id/projects/:projectId

Response: 200 OK
{
  "message": "Project unlinked successfully"
}
```

#### Projects

**Create Project**
```http
POST /projects
Content-Type: application/json

{
  "name": "AI Algorithm Development",
  "description": "Machine learning algorithm for..."
}

Response: 201 Created
{
  "project": {
    "projectId": "project-uuid",
    "name": "AI Algorithm Development",
    "description": "...",
    "createdAt": "2024-11-12T10:00:00.000Z",
    "updatedAt": "2024-11-12T10:00:00.000Z"
  }
}
```

**List Projects**
```http
GET /projects

Response: 200 OK
{
  "projects": [...]
}
```

**Get Single Project**
```http
GET /projects/:id

Response: 200 OK
{
  "project": {
    "projectId": "project-uuid",
    "name": "AI Algorithm Development",
    "claims": [
      {
        "claimId": "claim-uuid",
        "companyName": "Acme Corp",
        "status": "Draft",
        ...
      }
    ],
    ...
  }
}
```

**Update Project**
```http
PATCH /projects/:id
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}

Response: 200 OK
{
  "project": {...}
}
```

**Delete Project**
```http
DELETE /projects/:id

Response: 204 No Content
(No response body)
```

### Error Responses

#### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

**Example - 404 Not Found:**
```json
{
  "error": "Claim with ID invalid-claim-id not found"
}
```

#### Validation Error Format

Validation errors (400 Bad Request) include detailed information about each validation failure:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "companyName",
      "message": "Company name is required"
    },
    {
      "field": "amount",
      "message": "Amount must be positive"
    }
  ]
}
```

**Real Zod Validation Error Example:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "origin": "string",
      "code": "too_small",
      "minimum": 1,
      "inclusive": true,
      "path": ["companyName"],
      "message": "Company name is required"
    },
    {
      "origin": "number",
      "code": "too_small",
      "minimum": 0,
      "inclusive": false,
      "path": ["amount"],
      "message": "Amount must be positive"
    },
    {
      "origin": "string",
      "code": "invalid_format",
      "format": "regex",
      "pattern": "/^\\d{4}-\\d{2}-\\d{2}$/",
      "path": ["claimPeriod", "startDate"],
      "message": "Date must be in ISO 8601 format (YYYY-MM-DD)"
    }
  ]
}
```

**Common Status Codes:**
- `200` - OK (successful GET, PATCH, POST operations)
- `201` - Created (successful resource creation)
- `204` - No Content (successful DELETE operations)
- `400` - Bad Request (validation errors, invalid data)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected server errors)

## 🧪 Testing with curl

Below are complete curl commands to test every API endpoint locally.

**Prerequisites:**
- Mock server running at `http://localhost:3001`
- `jq` installed (optional, for pretty JSON output)

### Projects Endpoints

**Create Project:**
```bash
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "name": "AI Algorithm Development",
    "description": "Machine learning algorithms for predictive analytics"
  }'
```

**List All Projects:**
```bash
curl -X GET http://localhost:3001/projects \
  -H "X-User-Id: user-1"
```

**Get Single Project:**
```bash
curl -X GET http://localhost:3001/projects/{project-id} \
  -H "X-User-Id: user-1"
```

**Update Project:**
```bash
curl -X PATCH http://localhost:3001/projects/{project-id} \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "name": "AI Algorithm Development - Updated",
    "description": "Advanced machine learning with deep learning"
  }'
```

**Delete Project:**
```bash
curl -X DELETE http://localhost:3001/projects/{project-id} \
  -H "X-User-Id: user-1"
```

### Claims Endpoints

**Create Claim with Projects:**
```bash
curl -X POST http://localhost:3001/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "companyName": "Acme Corporation Ltd",
    "claimPeriod": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    },
    "amount": 50000,
    "projectIds": ["project-id-1", "project-id-2"]
  }'
```

**Create Claim without Projects:**
```bash
curl -X POST http://localhost:3001/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "companyName": "TechStart Ltd",
    "claimPeriod": {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    },
    "amount": 75000,
    "projectIds": []
  }'
```

**List All Claims:**
```bash
curl -X GET http://localhost:3001/claims \
  -H "X-User-Id: user-1"
```

**List Claims by Status:**
```bash
curl -X GET "http://localhost:3001/claims?status=Draft" \
  -H "X-User-Id: user-1"

curl -X GET "http://localhost:3001/claims?status=Submitted" \
  -H "X-User-Id: user-1"

curl -X GET "http://localhost:3001/claims?status=Approved" \
  -H "X-User-Id: user-1"
```

**Get Single Claim:**
```bash
curl -X GET http://localhost:3001/claims/{claim-id} \
  -H "X-User-Id: user-1"
```

**Update Claim Status:**
```bash
curl -X PATCH http://localhost:3001/claims/{claim-id} \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "status": "Submitted"
  }'
```

**Delete Claim:**
```bash
curl -X DELETE http://localhost:3001/claims/{claim-id} \
  -H "X-User-Id: user-1"
```

**Link Projects to Claim:**
```bash
curl -X POST http://localhost:3001/claims/{claim-id}/projects \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "projectIds": ["project-id-3"]
  }'
```

**Unlink Project from Claim:**
```bash
curl -X DELETE http://localhost:3001/claims/{claim-id}/projects/{project-id} \
  -H "X-User-Id: user-1"
```

### Testing Validation Errors

**Empty Company Name (400 Error):**
```bash
curl -X POST http://localhost:3001/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "companyName": "",
    "claimPeriod": {"startDate": "2024-01-01", "endDate": "2024-12-31"},
    "amount": 50000,
    "projectIds": []
  }'
```

**Invalid Date Format (400 Error):**
```bash
curl -X POST http://localhost:3001/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "companyName": "Test Corp",
    "claimPeriod": {"startDate": "invalid-date", "endDate": "2024-12-31"},
    "amount": 50000,
    "projectIds": []
  }'
```

**Negative Amount (400 Error):**
```bash
curl -X POST http://localhost:3001/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{
    "companyName": "Test Corp",
    "claimPeriod": {"startDate": "2024-01-01", "endDate": "2024-12-31"},
    "amount": -1000,
    "projectIds": []
  }'
```

**Non-existent Resource (404 Error):**
```bash
curl -X GET http://localhost:3001/claims/invalid-claim-id \
  -H "X-User-Id: user-1"
```

### Complete Testing Flow

Here's a complete flow to test the entire system:

```bash
# 1. Create two projects
PROJECT_1=$(curl -s -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{"name":"AI Research","description":"Machine learning research"}' \
  | jq -r '.project.projectId')

PROJECT_2=$(curl -s -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{"name":"Quantum Computing","description":"Quantum algorithm research"}' \
  | jq -r '.project.projectId')

echo "Created projects: $PROJECT_1, $PROJECT_2"

# 2. Create claim with projects
CLAIM_ID=$(curl -s -X POST http://localhost:3001/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d "{\"companyName\":\"Acme Corp\",\"claimPeriod\":{\"startDate\":\"2024-01-01\",\"endDate\":\"2024-12-31\"},\"amount\":50000,\"projectIds\":[\"$PROJECT_1\",\"$PROJECT_2\"]}" \
  | jq -r '.claim.claimId')

echo "Created claim: $CLAIM_ID"

# 3. Get claim with projects
curl -s -X GET http://localhost:3001/claims/$CLAIM_ID \
  -H "X-User-Id: user-1" | jq

# 4. Update claim status
curl -s -X PATCH http://localhost:3001/claims/$CLAIM_ID \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" \
  -d '{"status":"Submitted"}' | jq

# 5. Get project and see linked claims
curl -s -X GET http://localhost:3001/projects/$PROJECT_1 \
  -H "X-User-Id: user-1" | jq

# 6. List all claims with Submitted status
curl -s -X GET "http://localhost:3001/claims?status=Submitted" \
  -H "X-User-Id: user-1" | jq
```

**Note:** The script above requires `jq` for JSON parsing. If you don't have `jq`, remove the `| jq` parts and parse the JSON manually.

## ☁️ AWS Deployment

### Prerequisites

- AWS account configured
- AWS CLI installed and configured with credentials
- IAM user with AdministratorAccess or equivalent permissions

### Initial Setup (One-Time)

```bash
# Bootstrap CDK (only needed once per account/region)
npx cdk bootstrap
```

### Deploying

```bash
# Preview changes
npx cdk diff

# Deploy infrastructure
npx cdk deploy

# Deploy with auto-approval (CI/CD)
npx cdk deploy --require-approval never
```

**Outputs:**
After deployment, CDK will output the API Gateway endpoint URL. Save this for frontend configuration:

```
ClaimTrackerStack.ApiEndpoint = https://<api-id>.execute-api.eu-west-2.amazonaws.com/prod/
```

### Viewing Resources

```bash
# List CloudFormation stacks
aws cloudformation list-stacks --region eu-west-2

# List DynamoDB tables
aws dynamodb list-tables --region eu-west-2

# View Lambda functions
aws lambda list-functions --region eu-west-2
```

### Monitoring

```bash
# View Lambda logs
aws logs tail /aws/lambda/ClaimTrackerStack-CreateClaim --follow --region eu-west-2

# View all Lambda log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/ClaimTrackerStack" --region eu-west-2
```

### Tearing Down

```bash
# Delete all AWS resources
npx cdk destroy
```

**Note**: This will permanently delete all data in DynamoDB tables.

## 🧪 Testing

### Test Structure

- `test/claims.test.ts` - Claim endpoint integration tests
- `test/projects.test.ts` - Project endpoint integration tests
- `test/db.test.ts` - Database utility unit tests
- `test/auth.test.ts` - Authentication helper unit tests
- `test/utils.test.ts` - Utility function unit tests

### Test Helpers

Located in `test/helpers/`:
- Mock event builders for API Gateway events
- Mock DynamoDB clients
- Assertion helpers for common patterns

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- claims.test.ts

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🔐 Environment Variables

The following environment variables are set by CDK and passed to Lambda functions:

- `CLAIMS_TABLE` - Name of the Claims DynamoDB table
- `PROJECTS_TABLE` - Name of the Projects DynamoDB table
- `CLAIM_PROJECTS_TABLE` - Name of the ClaimProjects junction table

For local mock server development, these are not required.

## 🤖 AI Usage Notes

This project was built with AI assistance (as permitted by Novel's challenge guidelines). Here's how AI was used throughout development:

**Domain Research:**
- Researched UK SME R&D tax relief domain to understand business requirements
- Investigated how R&D projects span multiple claim periods
- Understood typical claim workflows and status transitions

**AWS Infrastructure:**
- Researched DynamoDB design patterns and best practices
- Helped write boilerplate for Lambda functions and CDK stack definitions
- Assisted with AWS CDK CLI commands and deployment workflows

**Development Acceleration:**
- Automated rapid API endpoint testing and fast iteration with curl scripts
- Helped write comprehensive unit tests for Lambda functions and utilities

**Documentation:**
- Generated comprehensive API documentation
- Generated comprehensive README documentation

**Validation:**
AI-generated code was reviewed, tested, and validated before inclusion. The architecture decisions and trade-offs were made independently with AI providing research and implementation assistance.

## 🗺️ Potential Future Enhancements

The following enhancements are planned:

### 1. Full Authentication & Authorization
- AWS Cognito user pools
- JWT token validation in Lambda authorizer
- User ID association with all resources

### 2. Advanced Role-Based Access Control
- Enforce role restrictions at API level
- Submitters: Can only edit their own Draft claims
- Reviewers: Can approve/reject Submitted claims
- Audit trail for all status changes

### 3. Enhanced Features
- File uploads (S3 integration)
- Email notifications (SES)
- Claim comments/notes
- Project cost tracking
- Advanced filtering and search

### 4. DevOps
- CI/CD pipeline with GitHub Actions
- Automated testing in staging environment
- Blue/green deployments
- Infrastructure monitoring and alerting

### 5. Performance Optimizations
- DynamoDB DAX caching
- Lambda response caching
- API Gateway response caching
- Connection pooling
