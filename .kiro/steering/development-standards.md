---
title: Development Standards
inclusion: fileMatch
# fileMatchPattern: "**/*.{ts,js,py,go,java,rb,php}"
fileMatchPattern: "**/*"
fileMatchExclude: "**/*.{md,txt}"
---

# Development Standards

## Dependency Management
- Use latest stable versions of all libraries and dependencies
- Leverage Context7 MCP server to verify compatibility before adding dependencies
- Justify each new dependency with clear business or technical value
- Prefer well-maintained libraries with active communities
- Document version constraints in project files
- Remove unused dependencies regularly
- Use lock files to ensure consistent installations across environments

## Code Quality Standards
- Never create duplicate files with suffixes like `_fixed`, `_clean`, `_backup`, etc.
- Work iteratively on existing files (hooks handle commits automatically)
- Include relevant documentation links in code comments
- Follow language-specific conventions (TypeScript for CDK, Python for Lambda)
- Use meaningful variable and function names
- Keep functions small and focused on single responsibilities
- Implement proper error handling and logging

## Code Comments for Human Review

### Comment Philosophy
All AI-generated code MUST include clear, helpful comments that make human review easy and efficient. Comments should explain the "why" and "what", not just the "how".

### Required Comments

#### File-Level Comments
Every file must start with a header comment explaining:
```typescript
/**
 * Feature: User Authentication
 * Purpose: Handles user login, logout, and session management
 * Dependencies: AWS Cognito, JWT library
 * Security: Implements rate limiting and input validation
 */
```

#### Function/Method Comments
Every function must have a comment explaining:
- What it does (purpose)
- Parameters and their types
- Return value and type
- Side effects (API calls, database writes, state changes)
- Error conditions

```typescript
/**
 * Authenticates a user with email and password
 * 
 * @param email - User's email address (validated)
 * @param password - User's password (will be hashed)
 * @returns JWT token and user profile
 * @throws AuthenticationError if credentials are invalid
 * 
 * Side effects:
 * - Creates session in database
 * - Logs authentication attempt
 * - Sends analytics event
 */
async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  // Implementation
}
```

#### Complex Logic Comments
Any non-obvious logic must be explained:
```typescript
// Calculate exponential backoff: 2^attempt * 100ms, max 30 seconds
// This prevents overwhelming the API during outages
const delay = Math.min(Math.pow(2, attempt) * 100, 30000);

// Use Set for O(1) lookup instead of array.includes() O(n)
const uniqueIds = new Set(userIds);
```

#### Security-Related Comments
All security decisions must be documented:
```typescript
// SECURITY: Validate input to prevent SQL injection
const sanitizedInput = validator.escape(userInput);

// SECURITY: Rate limit to 5 requests per minute per IP
await rateLimiter.check(req.ip, { max: 5, window: 60000 });

// SECURITY: Hash password with bcrypt (cost factor 12)
const hashedPassword = await bcrypt.hash(password, 12);
```

#### TODO and FIXME Comments
Use structured comments for future work:
```typescript
// TODO: Add pagination when user count exceeds 1000
// FIXME: This query is slow, needs indexing on user_email
// OPTIMIZE: Cache this result for 5 minutes
// SECURITY: Add rate limiting before production
```

#### Business Logic Comments
Explain business rules and decisions:
```typescript
// Business rule: Free tier users limited to 10 projects
if (user.tier === 'free' && user.projectCount >= 10) {
  throw new QuotaExceededError('Free tier limit reached');
}

// Per product requirements: Archive projects after 90 days of inactivity
const archiveThreshold = Date.now() - (90 * 24 * 60 * 60 * 1000);
```

#### API Integration Comments
Document external API interactions:
```typescript
// AWS Cognito: Verify JWT token
// Docs: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
const decoded = await cognito.verifyToken(token);

// Stripe API: Create payment intent
// Requires: amount in cents, currency code
// Returns: client_secret for frontend
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
});
```

### Comment Style Guidelines

#### DO: Write Clear, Helpful Comments
```typescript
// ✅ Good: Explains why and provides context
// Use debounce to avoid excessive API calls during typing
// Wait 300ms after user stops typing before searching
const debouncedSearch = debounce(searchAPI, 300);

// ✅ Good: Explains business logic
// Discount applies only to orders over $100 and for premium users
if (order.total > 100 && user.isPremium) {
  applyDiscount(order);
}
```

#### DON'T: Write Obvious Comments
```typescript
// ❌ Bad: States the obvious
// Increment counter by 1
counter++;

// ❌ Bad: Repeats the code
// Set user name to the name parameter
user.name = name;
```

#### DO: Explain Complex Algorithms
```typescript
// ✅ Good: Explains the algorithm
// Dijkstra's algorithm for shortest path
// Time complexity: O((V + E) log V) where V = vertices, E = edges
// Space complexity: O(V) for priority queue and distances map
function findShortestPath(graph: Graph, start: Node, end: Node): Path {
  // Implementation with inline comments for key steps
}
```

#### DO: Document Assumptions and Constraints
```typescript
// ✅ Good: Documents assumptions
// Assumes: User is already authenticated (checked by middleware)
// Assumes: Request body validated by Zod schema
// Constraint: Maximum 100 items per batch
async function batchUpdateItems(items: Item[]): Promise<void> {
  if (items.length > 100) {
    throw new Error('Batch size exceeds maximum of 100 items');
  }
  // Implementation
}
```

### Review-Friendly Code Structure

#### Group Related Code with Section Comments
```typescript
// ============================================================================
// Authentication Helpers
// ============================================================================

function validateToken() { /* ... */ }
function refreshToken() { /* ... */ }
function revokeToken() { /* ... */ }

// ============================================================================
// User Profile Management
// ============================================================================

function getProfile() { /* ... */ }
function updateProfile() { /* ... */ }
```

#### Explain State Changes
```typescript
// State transition: pending -> processing
order.status = 'processing';
await order.save();

// Notify user of status change
await sendEmail(user.email, 'Order Processing', template);

// Log for audit trail
logger.info('Order status changed', { 
  orderId: order.id, 
  from: 'pending', 
  to: 'processing' 
});
```

#### Document Error Handling Strategy
```typescript
try {
  // Attempt to charge payment method
  await stripe.charges.create(chargeData);
} catch (error) {
  // Stripe errors are safe to show to user (no sensitive data)
  if (error instanceof StripeError) {
    throw new PaymentError(error.message);
  }
  
  // Log unexpected errors but show generic message to user
  logger.error('Unexpected payment error', { error, orderId });
  throw new PaymentError('Payment processing failed. Please try again.');
}
```

### Language-Specific Comment Styles

#### TypeScript/JavaScript
```typescript
// Single-line comment for brief explanations

/**
 * Multi-line JSDoc comment for functions
 * Supports @param, @returns, @throws tags
 */

/* 
 * Multi-line comment for longer explanations
 * that don't need JSDoc formatting
 */
```

#### Python
```python
# Single-line comment for brief explanations

"""
Multi-line docstring for functions and classes
Follows PEP 257 conventions
"""

def authenticate_user(email: str, password: str) -> AuthResult:
    """
    Authenticates a user with email and password.
    
    Args:
        email: User's email address (validated)
        password: User's password (will be hashed)
        
    Returns:
        AuthResult containing JWT token and user profile
        
    Raises:
        AuthenticationError: If credentials are invalid
    """
    pass
```

### Comments Checklist

Before submitting code for review, ensure:
- [ ] File has header comment explaining purpose
- [ ] All public functions have descriptive comments
- [ ] Complex logic is explained with inline comments
- [ ] Security decisions are documented
- [ ] Business rules are clearly stated
- [ ] External API calls are documented with links
- [ ] Error handling strategy is explained
- [ ] Assumptions and constraints are noted
- [ ] No obvious or redundant comments
- [ ] Comments are up-to-date with code changes

## File Management
- Maintain clean directory structures
- Use consistent naming conventions across the project
- Avoid temporary or backup files in version control
- Organize code logically by feature or domain
- Keep configuration files at appropriate levels (project vs user)

## Documentation Approach
- Maintain single comprehensive README covering all aspects including deployment
- Reference official sources through MCP servers when available
- Update documentation when upgrading dependencies
- Keep documentation close to relevant code
- Use inline comments for complex business logic
- Document API endpoints and data structures
- Include setup and deployment instructions

## Version Control Integration
- Commit frequently with meaningful messages
- Use feature branches for development
- Keep main branch deployable at all times
- Tag releases appropriately
- Use .gitignore to exclude generated files and secrets

## Quality Assurance
- Write tests for new functionality
- Run tests before committing changes
- Use linting and formatting tools consistently
- Perform code reviews for all changes
- Monitor code coverage and maintain high standards