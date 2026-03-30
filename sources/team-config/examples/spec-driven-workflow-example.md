# Spec-Driven Development Workflow Example
## "Add User Authentication Feature"

This example demonstrates the complete OpenSpec-based workflow from idea to implementation.

---

## 📋 PHASE 1: Planning & Requirements

### Step 1.1: Product Owner Defines Vision

**Task:** "Define user authentication feature"
**Category:** `product-planning`
**Assigned To:** product-owner
**Model:** claude-opus-4-6 (temp: 0.3)

**Product Owner Actions:**
1. Analyzes market needs
2. Defines product vision
3. Creates `proposal.md`:

```markdown
# Feature: User Authentication

## Motivation
Users need secure access to their personal data. Current anonymous usage limits personalization.

## Goals
- Enable user account creation
- Support email/password authentication
- Prepare for OAuth integration (Phase 2)

## Non-Goals
- OAuth/social login (Phase 2)
- Two-factor authentication (Phase 3)
- Passwordless authentication (out of scope)
```

---

### Step 1.2: Business Analyst Gathers Requirements

**Task:** "Gather authentication requirements"
**Category:** `requirements-analysis`
**Assigned To:** business-analyst
**Model:** claude-sonnet-4-6 (temp: 0.2)

**Business Analyst Actions:**
1. Interviews stakeholders
2. Documents user stories
3. Updates `proposal.md` with user stories:

```markdown
## User Stories

### Story 1: Account Registration
**As a** new user
**I want to** create an account with email and password
**So that** I can access my personalized dashboard

**Scenario:** Successful registration
- **GIVEN** a new user with valid email
- **WHEN** they submit registration form
- **THEN** account is created AND verification email is sent

### Story 2: User Login
**As a** registered user
**I want to** login with email and password
**So that** I can access my account

**Scenario:** Successful login
- **GIVEN** a registered user
- **WHEN** they submit valid credentials
- **THEN** they are redirected to dashboard AND session is created
```

---

## 📝 PHASE 2: Specification

### Step 2.1: Spec Writer Creates Detailed Spec

**Task:** "Write authentication specification"
**Category:** `spec-writing`
**Assigned To:** spec-writer
**Model:** claude-sonnet-4-6 (temp: 0.1)

**Spec Writer Actions:**
1. Uses template: `/kanban/sources/team-config/templates/spec-template.md`
2. Creates `changes/add-user-authentication/spec.md`
3. Validates spec: `happy validate-spec changes/add-user-authentication/spec.md`

**Key Spec Sections:**

```markdown
## 3. Functional Requirements

### FR-1: User Registration
The system SHALL allow users to register with email and password.

**Acceptance Criteria:**
- [ ] Email format validation (RFC 5322)
- [ ] Password minimum 8 characters
- [ ] Password requires at least one letter and one number
- [ ] Email uniqueness check before account creation
- [ ] Verification email sent upon successful registration

### FR-2: User Login
The system SHALL authenticate users with email and password.

**Acceptance Criteria:**
- [ ] Invalid credentials return 401 error
- [ ] Successful login creates secure session
- [ ] Session expires after 7 days
- [ ] Users can logout explicitly

## 4. Technical Requirements

### API Specifications

**POST /api/auth/register**
Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```
Response:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "requiresVerification": true
}
```

**POST /api/auth/verify**
Request:
```json
{
  "token": "verification_token"
}
```
Response:
```json
{
  "message": "Email verified",
  "email": "user@example.com"
}
```
Errors:
- 400 Invalid token
- 410 Expired token

### Security Requirements
- All auth endpoints and APIs MUST use HTTPS
- Passwords MUST be hashed using bcrypt (cost factor: 12)
- Sessions MUST use HTTP-only cookies
- Session tokens MUST be cryptographically random, short-lived, and stored server-side or signed as JWT
- Session cookies MUST set HttpOnly, Secure, and SameSite=strict
- Rate limiting: per-IP and per-account (e.g., 5 attempts per 15 minutes)
- Account lockout after N failed attempts (define threshold and cooldown)
- CSRF protection required (synchronizer token or double-submit cookie)
```

---

### Step 2.2: Spec Validation

**Command:** `happy validate-spec changes/add-user-authentication/spec.md`

**Output:**
```
✅ Spec is VALID!

Summary:
   Errors: 0
   Warnings: 1

⚠️  Warnings:
   [testing] Consider adding ADR for bcrypt vs alternatives
```

---

### Step 2.3: Architect Reviews & Approves

**Task:** "Review authentication spec for feasibility"
**Category:** `architecture`
**Assigned To:** architect
**Model:** gpt-5.2 (temp: 0.2)

**Architect Actions:**
1. Reviews technical feasibility
2. Checks security implications
3. Creates ADR (Architecture Decision Record):

```markdown
# ADR-001: Use bcrypt for Password Hashing

## Context
Need secure password hashing for user authentication.

## Decision
Use bcrypt with cost factor 12.

## Rationale
- Proven, battle-tested algorithm
- Adaptive cost factor (can increase with hardware)
- Built-in salt generation
- Better than PBKDF2 for this use case

## Consequences
- **Positive:** Industry-standard security
- **Positive:** Simple implementation
- **Negative:** Slower than argon2 (but acceptable)

## Alternatives Considered
- argon2: More modern but less library support
- PBKDF2: Good but less adaptive
- scrypt: Good but more complex
```

**Architect Approval:** ✅ Approved for implementation

---

## 🎨 PHASE 3: Design

### Step 3.1: UX Researcher Conducts Research

**Task:** "Research authentication best practices"
**Category:** `ux-research`
**Assigned To:** ux-researcher
**Model:** claude-sonnet-4-6 (temp: 0.3)

**Research Findings:**
- Users expect inline validation (not after submit)
- Password strength indicators improve security
- "Show password" toggle reduces errors
- Social login anticipation (even if not implemented)

---

### Step 3.2: Product Designer Creates UI/UX

**Task:** "Design authentication UI screens"
**Category:** `ux-design`
**Assigned To:** product-designer
**Model:** gemini-2.5-pro (temp: 0.7)

**Designer Actions:**
1. Creates wireframes for:
   - Registration form
   - Login form
   - Password reset flow
   - Email verification screen
2. Designs interaction flows
3. Defines design system components

**Design Deliverables:**
- Figma prototype: [link]
- Component specifications: Button, Input, Form Validation
- Accessibility: WCAG 2.1 AA compliant

---

## 💻 PHASE 4: Implementation

### Step 4.1: Implementer Codes the Feature

**Task:** "Implement user authentication API"
**Category:** `code-implementation`
**Assigned To:** implementer
**Model:** claude-sonnet-4-6 (temp: 0.3)

**Implementer Workflow:**
1. **Reads Spec:** `changes/add-user-authentication/spec.md`
2. **Follows Spec Exactly:**
   - Implements `/api/auth/register` endpoint
   - Implements `/api/auth/login` endpoint
   - Implements bcrypt hashing (cost factor: 12)
   - Implements rate limiting (5/15min)
3. **Writes Tests:**
   ```typescript
   describe('POST /api/auth/register', () => {
     it('SHALL create user with valid email and password', async () => {
       const response = await request(app)
         .post('/api/auth/register')
         .send({ email: 'test@example.com', password: 'SecurePass123' });

       expect(response.status).toBe(201);
       expect(response.body.userId).toBeDefined();
     });

     it('SHALL reject invalid email format', async () => {
       const response = await request(app)
         .post('/api/auth/register')
         .send({ email: 'invalid', password: 'SecurePass123' });

       expect(response.status).toBe(400);
     });
   });
   ```
4. **Updates Kanban:** Marks task "In Progress"
5. **Runs Tests:** `npm test --coverage`
6. **Requests Review:** Notifies QA Engineer via team message

**Team Message:**
```
@qa-engineer Feature ready for testing: User Authentication
Spec: changes/add-user-authentication/spec.md
Branch: feature/user-authentication
Tests: 85% coverage
```

---

## 🧪 PHASE 5: Testing

### Step 5.1: QA Engineer Tests Against Acceptance Criteria

**Task:** "Test authentication feature"
**Category:** `testing`
**Assigned To:** qa-engineer
**Model:** claude-haiku-4 (temp: 0.1)

**QA Workflow:**
1. **Reads Spec:** All acceptance criteria from FR-1, FR-2
2. **Tests Each Criterion:**
   - ✅ Email format validation (RFC 5322) - PASS
   - ✅ Password minimum 8 characters - PASS
   - ✅ Password requires letter + number - PASS
   - ✅ Email uniqueness check - PASS
   - ✅ Verification email sent - PASS
   - ✅ Invalid credentials return 401 - PASS
   - ✅ Session created on login - PASS
   - ✅ Session expires after 7 days - PASS
   - ✅ Logout functionality - PASS
3. **Tests Edge Cases:**
   - SQL injection attempts - BLOCKED
   - Duplicate email registration - REJECTED
   - Brute force login - RATE LIMITED
4. **Documents Results:**
   ```
   All acceptance criteria: ✅ PASS
   Edge cases tested: 10/10
   Bugs found: 0
   Status: READY FOR PRODUCTION
   ```
5. **Updates Kanban:** Moves task to "Done"

---

## 📚 PHASE 6: Documentation

### Step 6.1: Technical Writer Creates Documentation

**Task:** "Write authentication documentation"
**Category:** `documentation`
**Assigned To:** technical-writer
**Model:** gemini-2.5-flash (temp: 0.4)

**Documentation Deliverables:**
1. **API Documentation:**
   ```markdown
   ## Authentication API

   ### Register User
   POST /api/auth/register

   Creates a new user account.

   **Request Body:**
   | Field | Type | Required | Description |
   |-------|------|----------|-------------|
   | email | string | Yes | User email (valid format) |
   | password | string | Yes | Password (min 8 chars, 1 letter + 1 number) |

   **Response:** 201 Created
   **Errors:** 400 Bad Request, 409 Conflict (email exists)

   **Example:**
   \`\`\`bash
   curl -X POST https://api.example.com/auth/register \\
     -H "Content-Type: application/json" \\
     -d '{"email":"user@example.com","password":"SecurePass123"}'
   \`\`\`
   ```

2. **User Guide:** "How to create an account"
3. **Integration Guide:** For frontend developers
4. **Troubleshooting:** Common issues and solutions

---

## 📦 PHASE 7: Archive

### Step 7.1: Spec Writer Archives Spec

**Task:** "Archive approved authentication spec"
**Category:** `spec-writing`
**Assigned To:** spec-writer

**Archive Actions:**
1. Moves `changes/add-user-authentication/spec.md` to `specs/authentication/user-registration.md`
2. Updates `specs/SPEC_INDEX.md` with new entry
3. Marks feature as "Implemented" in proposal
4. Cleans up `changes/add-user-authentication/` directory

---

## 📊 Workflow Metrics

**Timeline:**
- Phase 1 (Planning): 2 days
- Phase 2 (Spec): 1 day
- Phase 3 (Design): 2 days
- Phase 4 (Implementation): 3 days
- Phase 5 (Testing): 1 day
- Phase 6 (Documentation): 1 day
- **Total: 10 days**

**Team Coordination:**
- 7 roles involved
- 9 handoffs
- 0 blockers (smooth workflow)
- 100% spec compliance

**Quality Metrics:**
- Test coverage: 85%
- All acceptance criteria met
- 0 bugs in production
- Documentation complete

---

## 🎯 Key Success Factors

### 1. **Category-Based Routing** ✅
- Each task automatically routed to appropriate agent
- Right model for each task (Opus for strategy, Gemini for design, Haiku for testing)
- Clear responsibility boundaries

### 2. **Spec-Driven Development** ✅
- Clear requirements before coding
- Implementer followed spec exactly
- Zero ambiguity or rework
- Complete audit trail

### 3. **Team Collaboration** ✅
- Clear handoff protocols
- Team messages kept everyone aligned
- No duplicate work
- Efficient parallel work (design + architecture)

### 4. **Quality Gates** ✅
- Spec validation before implementation
- Architect approval required
- All acceptance criteria verified
- Documentation complete before merge

---

## 🔄 What Makes This Workflow Powerful?

### Before Spec-Driven Development:
```
User Request → Implementer codes → QA finds bugs → Rework → Deploy
⚠️  Requirements unclear
⚠️  Rework required
⚠️  No documentation
⚠️  Unclear success criteria
```

### After Spec-Driven Development:
```
User Request → Spec → Design → Implementation → QA → Deploy → Archive
✅ Clear requirements (spec)
✅ Design before code
✅ Zero rework (followed spec)
✅ Complete documentation
✅ Measurable success criteria
✅ Living documentation (archived specs)
```

---

## 🚀 Next Steps for This Feature

**Phase 2 (Future):**
1. OAuth/social login (Google, GitHub)
2. Two-factor authentication (TOTP)
3. Passwordless authentication (magic links)

**Each new phase starts fresh at PHASE 1** with its own spec!

---

**Workflow Status:** ✅ COMPLETE
**Feature Status:** ✅ PRODUCTION READY
**Documentation:** ✅ COMPLETE
