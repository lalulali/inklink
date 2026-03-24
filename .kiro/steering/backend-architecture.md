---
title: Backend Architecture - Simple, Scalable, Secure
# inclusion: fileMatch
# fileMatchPattern: "**/*.{py,js,ts,go,java,rb,php}"
inclusion: auto
description: use when designing and developing backend system
---

# Backend Architecture Principles

## Core Philosophy
Build backends that are simple to understand, easy to scale, and secure by default. Prioritize developer experience without compromising on production readiness.

## Architecture Principles

### Simplicity First
- **Clear Structure**: Organized by feature/domain, not technical layers
- **Minimal Abstractions**: Only abstract when patterns repeat 3+ times
- **Explicit Over Clever**: Readable code beats clever code
- **Standard Patterns**: Use well-known patterns (REST, GraphQL, event-driven)
- **Self-Documenting**: Code should explain itself, comments explain why

### Built to Scale
- **Stateless Services**: Services don't store session state locally
- **Horizontal Scaling**: Add more instances, not bigger instances
- **Async Where Appropriate**: Use queues/events for non-blocking operations
- **Database Optimization**: Proper indexing, connection pooling, query optimization
- **Caching Strategy**: Cache at multiple layers (CDN, API, database)
- **Rate Limiting**: Protect resources from abuse
- **Graceful Degradation**: System remains functional under load

### Security by Default
- **Zero Trust**: Never trust input, always validate and sanitize
- **Least Privilege**: Services and users get minimum required permissions
- **Defense in Depth**: Multiple layers of security
- **Secure by Default**: Security is not optional or added later
- **Audit Everything**: Log security-relevant events
- **Fail Securely**: Errors don't expose sensitive information

## Security Requirements

### Authentication & Authorization
- **Strong Authentication**: Use proven auth providers (AWS Cognito, Auth0, Firebase Auth)
- **JWT Best Practices**: Short expiration, refresh tokens, proper signing
- **Role-Based Access Control (RBAC)**: Clear roles and permissions
- **API Key Management**: Rotate keys, scope permissions, monitor usage
- **Multi-Factor Authentication**: Support MFA for sensitive operations
- **Session Management**: Secure session handling, proper timeout, logout

### Input Validation & Sanitization
- **Validate Everything**: All inputs validated at API boundary
- **Type Safety**: Use TypeScript/strong typing to catch errors early
- **Schema Validation**: Use Zod, Joi, or similar for runtime validation
- **SQL Injection Prevention**: Use parameterized queries, ORMs
- **XSS Prevention**: Sanitize HTML, use Content Security Policy
- **Command Injection Prevention**: Never execute user input as commands

### Data Protection
- **Encryption at Rest**: Sensitive data encrypted in database
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Secrets Management**: Use AWS Secrets Manager, Parameter Store, or similar
- **PII Handling**: Minimize collection, encrypt storage, comply with regulations
- **Data Retention**: Clear policies for data lifecycle
- **Secure Deletion**: Properly delete sensitive data when no longer needed

### API Security
- **HTTPS Only**: No plain HTTP in production
- **CORS Configuration**: Strict CORS policies, whitelist origins
- **Rate Limiting**: Prevent abuse and DDoS
- **Request Size Limits**: Prevent payload attacks
- **API Versioning**: Maintain backward compatibility
- **Error Handling**: Generic errors to clients, detailed logs internally
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.

### Infrastructure Security
- **Principle of Least Privilege**: IAM roles with minimal permissions
- **Network Segmentation**: Private subnets for databases, public for APIs
- **Security Groups**: Strict firewall rules, only necessary ports
- **Secrets Never in Code**: Use environment variables, secrets managers
- **Dependency Scanning**: Regular security audits of dependencies
- **Container Security**: Scan images, run as non-root, minimal base images
- **Logging & Monitoring**: Centralized logging, security alerts, anomaly detection

## Backend Architecture Patterns

### API Design
- **RESTful Principles**: Proper HTTP methods, status codes, resource naming
- **Consistent Response Format**: Standard success/error response structure
- **Pagination**: Always paginate list endpoints
- **Filtering & Sorting**: Support common query patterns
- **API Documentation**: OpenAPI/Swagger for all endpoints
- **Versioning Strategy**: URL versioning (v1, v2) or header-based

### Database Design
- **Normalized Schema**: Avoid data duplication (unless intentional denormalization)
- **Proper Indexing**: Index foreign keys, frequently queried fields
- **Connection Pooling**: Reuse database connections
- **Migration Strategy**: Version-controlled schema migrations
- **Backup Strategy**: Automated backups, tested restore procedures
- **Read Replicas**: Separate read/write workloads for scale

### Error Handling
- **Structured Errors**: Consistent error format with codes
- **Error Logging**: Log errors with context (user ID, request ID, stack trace)
- **User-Friendly Messages**: Don't expose internal details to users
- **Retry Logic**: Exponential backoff for transient failures
- **Circuit Breakers**: Prevent cascading failures
- **Dead Letter Queues**: Handle failed async operations

### Observability
- **Structured Logging**: JSON logs with correlation IDs
- **Metrics**: Track latency, error rates, throughput
- **Distributed Tracing**: Trace requests across services
- **Health Checks**: Liveness and readiness endpoints
- **Alerting**: Alert on anomalies, errors, performance degradation
- **Dashboards**: Real-time visibility into system health

## Technology Stack Preferences

### Serverless-First (AWS)
- **API Gateway + Lambda**: For APIs and microservices
- **DynamoDB**: For NoSQL, high-scale workloads
- **RDS/Aurora**: For relational data
- **S3**: For file storage
- **SQS/SNS**: For async messaging
- **EventBridge**: For event-driven architecture
- **Cognito**: For authentication
- **CloudWatch**: For logging and monitoring

### Container-Based (Alternative)
- **ECS/Fargate or EKS**: For containerized services
- **Application Load Balancer**: For routing
- **RDS/Aurora**: For databases
- **ElastiCache**: For caching
- **CloudWatch/Prometheus**: For monitoring

### Language & Framework
- **TypeScript**: For type safety and developer experience
- **Node.js**: For Lambda functions and APIs
- **Python**: For data processing, ML workloads
- **Express/Fastify**: For REST APIs
- **GraphQL**: For flexible data fetching (when appropriate)

## Code Organization

### Project Structure
```
backend/
├── src/
│   ├── api/              # API routes and handlers
│   │   ├── users/
│   │   ├── auth/
│   │   └── ...
│   ├── services/         # Business logic
│   ├── models/           # Data models and schemas
│   ├── middleware/       # Auth, validation, logging
│   ├── utils/            # Shared utilities
│   ├── config/           # Configuration
│   └── types/            # TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── infrastructure/       # IaC (CDK, Terraform)
└── docs/                 # API documentation
```

### Feature-Based Organization (Alternative)
```
backend/
├── src/
│   ├── features/
│   │   ├── users/
│   │   │   ├── api.ts
│   │   │   ├── service.ts
│   │   │   ├── model.ts
│   │   │   └── tests/
│   │   ├── auth/
│   │   └── ...
│   ├── shared/           # Shared code
│   └── core/             # Core utilities
```

## Development Workflow

### Before Writing Code
- [ ] Define API contract (OpenAPI spec)
- [ ] Design data models and relationships
- [ ] Identify security requirements
- [ ] Plan for error handling
- [ ] Consider scalability implications

### During Development
- [ ] Write tests first (TDD) or alongside code
- [ ] Validate all inputs
- [ ] Handle errors gracefully
- [ ] Log important events
- [ ] Use TypeScript for type safety
- [ ] Follow security best practices

### Before Deployment
- [ ] All tests passing
- [ ] Security scan completed
- [ ] API documentation updated
- [ ] Environment variables configured
- [ ] Monitoring and alerts set up
- [ ] Rollback plan documented
- [ ] Load testing completed (for critical paths)

## Performance Optimization

### Database
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization (avoid N+1 queries)
- Caching frequently accessed data
- Read replicas for read-heavy workloads

### API
- Response compression (gzip)
- Pagination for large datasets
- Field selection (GraphQL) or sparse fieldsets (REST)
- Caching headers (ETag, Cache-Control)
- CDN for static content

### Async Processing
- Use queues for long-running tasks
- Background jobs for non-critical operations
- Event-driven architecture for decoupling
- Batch processing where appropriate

## Testing Strategy

### Unit Tests
- Test business logic in isolation
- Mock external dependencies
- Fast execution (<1s per test)
- High coverage (>80%)

### Integration Tests
- Test API endpoints end-to-end
- Use test database
- Test authentication and authorization
- Test error scenarios

### Security Tests
- Test input validation
- Test authentication bypass attempts
- Test authorization boundaries
- SQL injection, XSS attempts
- Rate limiting effectiveness

### Load Tests
- Test under expected load
- Test under peak load
- Identify bottlenecks
- Verify auto-scaling

## Deployment & Operations

### Infrastructure as Code
- All infrastructure defined in code (CDK, Terraform)
- Version controlled
- Automated deployments
- Environment parity (dev, staging, prod)

### CI/CD Pipeline
- Automated testing on every commit
- Security scanning
- Automated deployments to staging
- Manual approval for production
- Automated rollback on failure

### Monitoring & Alerting
- Monitor error rates, latency, throughput
- Alert on anomalies
- Dashboard for system health
- Log aggregation and search
- Distributed tracing

### Incident Response
- Runbooks for common issues
- On-call rotation
- Post-mortem process
- Continuous improvement

## Security Checklist

### Every API Endpoint Must Have:
- [ ] Authentication (unless intentionally public)
- [ ] Authorization (user has permission)
- [ ] Input validation (schema validation)
- [ ] Rate limiting
- [ ] Error handling (no sensitive data in errors)
- [ ] Logging (who did what, when)
- [ ] Tests (including security tests)

### Every Database Table Must Have:
- [ ] Proper indexes
- [ ] Encryption at rest (for sensitive data)
- [ ] Access control (least privilege)
- [ ] Backup strategy
- [ ] Migration scripts (version controlled)

### Every Lambda/Service Must Have:
- [ ] Least privilege IAM role
- [ ] Environment variables for config
- [ ] Secrets from Secrets Manager
- [ ] Error handling and logging
- [ ] Timeout configured
- [ ] Memory optimized
- [ ] Dead letter queue (for async)

## Common Pitfalls to Avoid

### Security
- ❌ Trusting user input without validation
- ❌ Storing secrets in code or environment variables (use Secrets Manager)
- ❌ Exposing internal errors to users
- ❌ Missing authentication on endpoints
- ❌ Insufficient authorization checks
- ❌ Not rate limiting APIs

### Scalability
- ❌ Storing state in application memory
- ❌ Not using connection pooling
- ❌ Missing database indexes
- ❌ Synchronous processing of long tasks
- ❌ Not implementing caching
- ❌ Missing pagination on list endpoints

### Maintainability
- ❌ Overly complex abstractions
- ❌ Missing tests
- ❌ Poor error messages
- ❌ No logging or monitoring
- ❌ Inconsistent code style
- ❌ Missing documentation

## Best Practices Summary

1. **Start Simple**: Build the simplest thing that works, optimize later
2. **Security First**: Never compromise on security
3. **Test Everything**: Write tests, especially for security
4. **Monitor Always**: You can't fix what you can't see
5. **Document Well**: Future you will thank present you
6. **Automate Deployment**: Manual deployments lead to errors
7. **Plan for Failure**: Systems fail, design for resilience
8. **Keep Learning**: Security and best practices evolve
