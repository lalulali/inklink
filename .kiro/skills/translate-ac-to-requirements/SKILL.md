---
name: translate-ac-to-requirements
description: Transforms acceptance criteria into structured business and technical requirements. Perfect for product managers, business analysts, and developers who need to bridge the gap between user stories and implementation details.
---

# Translate AC to Requirements

This skill helps you transform acceptance criteria into well-structured business and technical requirements, ensuring clear alignment between stakeholder expectations and development implementation.

## When to Use This Skill

- Converting user stories with acceptance criteria into actionable requirements
- Bridging communication gaps between business stakeholders and engineering teams
- Creating technical specifications from product descriptions
- Ensuring completeness and testability of requirements
- Preparing for sprint planning and estimation
- Documenting feature requirements for architecture reviews

## What This Skill Does

1. **Analyzes Acceptance Criteria**: Breaks down AC into discrete, testable statements
2. **Extracts Business Requirements**: Identifies the "why" behind each requirement
3. **Derives Technical Requirements**: Maps business needs to technical specifications
4. **Ensures Completeness**: Validates that all scenarios are covered
5. **Creates Traceability**: Links requirements back to original acceptance criteria
6. **Prioritizes Requirements**: Helps identify dependencies and critical paths

## How to Use

### Basic Usage

Provide acceptance criteria and get structured requirements:

```
Convert these acceptance criteria into business and technical requirements:

As a [user role], I want to [action] so that [benefit]

Acceptance Criteria:
1. [AC 1]
2. [AC 2]
3. [AC 3]
```

### With User Story Context

Provide full user story for better analysis:

```
User Story: As a registered user, I want to export my data to CSV so that I can analyze it in external tools.

Acceptance Criteria:
- Export button is visible on the data page
- Clicking export downloads a CSV file within 5 seconds
- CSV includes all data columns with proper headers
- Large datasets (>10MB) show a progress indicator
- User receives email notification when export completes
- Export fails gracefully with error message if timeout occurs
```

### For Complex Features

For multi-faceted features, provide additional context:

```
Feature: Payment Processing
Stakeholders: Finance team, Customers, Compliance
Priority: High
Timeline: Q2 2024

[Acceptance criteria here]
```

### Output File

The skill will create a new document (not requirements.md) with the translated requirements. If the user specifies a different filename, use that filename instead.

## Instructions

When a user requests requirement translation:

### 1. Analyze the Acceptance Criteria

- Identify each discrete acceptance criterion
- Note the user role and context from the user story
- Identify implicit requirements not explicitly stated
- Flag any ambiguous or incomplete criteria

### 2. Extract Business Requirements

For each acceptance criterion, derive:

- **Business Goal**: What business objective does this support?
- **User Value**: What benefit does this provide to the user?
- **Success Metric**: How will we measure success?
- **Priority**: Must-have, should-have, or nice-to-have
- **Dependencies**: Other features or systems required

### 3. Derive Technical Requirements

Map each business requirement to technical specifications:

- **Functional Requirements**: What the system must do
- **Non-Functional Requirements**: Performance, security, scalability
- **Integration Requirements**: External systems or APIs
- **Data Requirements**: Storage, format, validation
- **UI/UX Requirements**: Interface specifications
- **Error Handling**: Failure modes and recovery

### 4. Structure the Output

Present requirements in the following format:

```markdown
## Requirements

### Requirement 1: [Requirement Title]
#### User Story 
As a [role], I want to [action] so that [benefit]
**Priority**: Must-have | Should-have | Nice-to-have

#### Business Requirements

- Description: [Clear statement of the business need]
- Business Goal: [What business objective this supports]
- User Value: [Benefit to end user]
- Success Criteria: [How to measure success]

Requirements:
- [Business requirement 1]
- [Business requirement 2]
- ...

#### Technical Requirements

- Description: [Technical specification]
- Type: Functional | Performance | Security | Integration (can pick more than 1)
- Dependencies: [List of dependencies]
- Technical Notes: [Implementation guidance]

Requirements:
- [Technical requirement 1]
    - [Testable Scenario 1]
    - [Testable Scenario 2]
    - ...
- [Technical requirement 2]
    - [Testable Scenario 1]
    - [Testable Scenario 2]
    - ...
- ... 

#### Acceptance Criteria 
- [Acceptance criterion 1] (gherkin)
- [Acceptance criterion 2] (gherkin)
- ...

---

### Requirement 2: [Requirement Title]
**User Story:** As a [role], I want to [action] so that [benefit]

#### Business Requirements
- [Business requirement 1]

#### Technical Requirements
- [Technical requirement 1]

#### Acceptance Criteria
- [Acceptance criterion 1]

---

[Repeat for each requirement]
```

### 5. Validate Completeness

Check that requirements cover:

- [ ] Happy path scenarios
- [ ] Error conditions and edge cases
- [ ] Performance expectations
- [ ] Security requirements
- [ ] Accessibility needs
- [ ] Localization/internationalization
- [ ] Data retention and privacy
- [ ] Integration points

### 6. Provide Implementation Guidance

For each technical requirement, suggest:

- **Suggested Approach**: Recommended implementation strategy
- **Complexity Estimate**: Low | Medium | High
- **Risks**: Potential issues to watch for
- **Testing Strategy**: How to verify the requirement

## Examples

### Example 1: Simple Feature

**User Input**:
```
User Story: As a project manager, I want to assign tasks to team members so that work is distributed properly.

Acceptance Criteria:
1. Task assignment dropdown shows all team members
2. Selected assignee is displayed on the task card
3. Email notification sent to assignee when task is assigned
4. Assignment can be changed by task owner or admin
```

**Output**:
```markdown
## Requirements

### Requirement 1: Task Assignment Display
#### User Story
As a project manager, I want to assign tasks to team members so that work is distributed properly.
**Priority**: Must-have

#### Business Requirements

- Description: Team members must be easily discoverable and assignable from the task interface
- Business Goal: Improve task distribution efficiency and team accountability
- User Value: Project managers can quickly assign work without leaving the task view
- Success Criteria: All active team members appear in the dropdown and assignment is reflected immediately on the task card

Requirements:
- The system must display an assignment dropdown on every task
- The dropdown must list all active team members
- The selected assignee must be visibly displayed on the task card

#### Technical Requirements

- Description: User selection dropdown integrated with the task card UI, backed by the authentication service
- Type: Functional
- Dependencies: Authentication service (user list), Task card UI component
- Technical Notes: Fetch user list on dropdown open; consider search/filter for large teams

Requirements:
- User dropdown component with search functionality
    - Given a task with no assignee, when the PM opens the dropdown, then all active team members are listed
    - Given a list of 50+ members, when the PM types in the search box, then the list filters in real time
- Task card UI component updated to display assignee name and avatar
    - Given an assignee is selected, when the task card re-renders, then the assignee name and avatar are visible

#### Acceptance Criteria
- Given a task is open, when the PM clicks the assign field, then a dropdown showing all team members appears
- Given an assignee is selected, when the task card is viewed, then the selected assignee is displayed on the card

---

### Requirement 2: Assignment Notifications
#### User Story
As a project manager, I want to assign tasks to team members so that work is distributed properly.
**Priority**: Must-have

#### Business Requirements

- Description: Assignees must be notified promptly when a task is assigned to them
- Business Goal: Ensure timely awareness of new work assignments to maintain team velocity
- User Value: Team members stay informed without needing to manually check for new tasks
- Success Criteria: Notification email is delivered within 1 minute of assignment

Requirements:
- The system must send an email notification upon task assignment
- Notification must include task title, description, and a direct link to the task

#### Technical Requirements

- Description: Async email notification triggered by assignment event
- Type: Functional, Integration
- Dependencies: Email notification service, message queue
- Technical Notes: Use async queue to decouple notification from assignment action to maintain UI responsiveness

Requirements:
- Email notification service integration
    - Given a task is assigned, when the assignment is saved, then an email is dispatched to the assignee
    - Given the email service is unavailable, when the assignment is saved, then the assignment succeeds and the notification is retried
- Async notification queue for reliability
    - Given a notification is queued, when the email service recovers, then the notification is delivered without duplication

#### Acceptance Criteria
- Given a PM assigns a task, when the assignment is confirmed, then the assignee receives an email notification with task details

---

### Requirement 3: Assignment Modification
#### User Story
As a project manager, I want to assign tasks to team members so that work is distributed properly.
**Priority**: Should-have

#### Business Requirements

- Description: Task assignments must be modifiable by authorized users to allow corrections
- Business Goal: Maintain assignment accuracy and support changing team priorities
- User Value: Task owners and admins can correct mistakes or re-route work without system intervention
- Success Criteria: Authorized users can change the assignee and the change is persisted correctly

Requirements:
- Only the task owner or an admin may change the assignee
- Unauthorized users must not see or access the reassign control

#### Technical Requirements

- Description: Role-based access control enforced on the assignment modification action
- Type: Functional, Security
- Dependencies: RBAC module, audit logging service
- Technical Notes: Enforce authorization server-side; do not rely solely on UI hiding

Requirements:
- Role-based access control (task owner, admin)
    - Given a user is the task owner, when they open the task, then the reassign control is visible and functional
    - Given a user is not the task owner or admin, when they open the task, then the reassign control is hidden or disabled
- Audit logging for assignment changes
    - Given an assignment is changed, when the save is confirmed, then an audit log entry records the actor, previous assignee, and new assignee

#### Acceptance Criteria
- Given a task is open, when the task owner or admin selects a new assignee, then the assignment is updated successfully
- Given a regular team member views a task they do not own, when they view the task, then they cannot change the assignee
```

### Example 2: Complex Feature

**User Input**:
```
Feature: Real-time Dashboard
Priority: High
Stakeholders: Executives, Operations Team

User Story: As an executive, I want to see real-time metrics so that I can make data-driven decisions.

Acceptance Criteria:
1. Dashboard loads within 3 seconds
2. Metrics update automatically every 30 seconds
3. Charts support drill-down into daily/weekly/monthly views
4. Data can be exported to PDF for board meetings
5. Dashboard is accessible on mobile devices
6. Sensitive data is masked for unauthorized viewers
```

**Output**:
```markdown
## Requirements

### Requirement 1: Dashboard Performance
#### User Story
As an executive, I want to see real-time metrics so that I can make data-driven decisions.
**Priority**: Must-have

#### Business Requirements

- Description: The dashboard must load quickly enough to support time-sensitive executive decision-making
- Business Goal: Drive user adoption and reduce decision latency caused by slow tooling
- User Value: Executives spend less time waiting and more time acting on data
- Success Criteria: Dashboard initial load completes within 3 seconds under normal network conditions

Requirements:
- Dashboard must load within 3 seconds for authenticated users
- Performance must be maintained under concurrent executive usage

#### Technical Requirements

- Description: Optimized data pipeline and asset delivery to meet the 3-second load target
- Type: Performance
- Dependencies: CDN, caching layer, data aggregation service
- Technical Notes: Pre-aggregate metrics on a schedule; avoid on-demand heavy queries at load time

Requirements:
- Optimized data aggregation queries
    - Given a user opens the dashboard, when the page loads, then aggregated metrics are returned within 2 seconds from the API
- Caching layer for frequently accessed metrics
    - Given metrics were last updated less than 30 seconds ago, when a new request comes in, then the cached result is served
- CDN for static assets
    - Given the dashboard assets are deployed, when a user loads the page, then JS and CSS are served from the CDN edge node

#### Acceptance Criteria
- Given an authenticated executive opens the dashboard, when the page is loaded, then all metrics are visible within 3 seconds

---

### Requirement 2: Real-time Data Updates
#### User Story
As an executive, I want to see real-time metrics so that I can make data-driven decisions.
**Priority**: Must-have

#### Business Requirements

- Description: Metrics must refresh automatically so executives always see current data without manual intervention
- Business Goal: Ensure decisions are based on the most recent operational data
- User Value: Reduces manual refresh habits and increases trust in dashboard accuracy
- Success Criteria: All metric values on the dashboard update within 30 seconds of the underlying data changing

Requirements:
- Dashboard metrics must auto-refresh every 30 seconds
- Auto-refresh must not require a full page reload

#### Technical Requirements

- Description: Push-based or polling mechanism to deliver metric updates to the browser
- Type: Functional, Performance
- Dependencies: WebSocket or Server-Sent Events infrastructure
- Technical Notes: Prefer WebSocket for true push; fall back to SSE or polling if infrastructure limitations apply

Requirements:
- WebSocket or Server-Sent Events for live updates
    - Given the dashboard is open, when 30 seconds elapse, then updated metric values are reflected without user action
    - Given the connection drops, when reconnected, then the dashboard resumes auto-updating
- Efficient change detection to minimize server load
    - Given no underlying data has changed, when the refresh interval fires, then no unnecessary UI re-renders occur

#### Acceptance Criteria
- Given the dashboard is open, when 30 seconds pass, then all metric values are automatically refreshed without a page reload

---

### Requirement 3: Data Export
#### User Story
As an executive, I want to see real-time metrics so that I can make data-driven decisions.
**Priority**: Should-have

#### Business Requirements

- Description: Executives must be able to export dashboard data as a PDF for board presentations
- Business Goal: Enable consistent, shareable reporting for stakeholder meetings
- User Value: Eliminates manual screenshot workflows and ensures data integrity in reports
- Success Criteria: Exported PDF accurately represents the current dashboard state including charts

Requirements:
- A PDF export action must be available from the dashboard
- The exported PDF must include all visible metrics and charts

#### Technical Requirements

- Description: Server-side PDF generation from current dashboard snapshot
- Type: Functional, Integration
- Dependencies: PDF generation library, secure file storage, background job queue
- Technical Notes: Generate PDF server-side for consistency; use a background job for large datasets and notify via email when ready

Requirements:
- PDF generation library integration
    - Given an executive triggers export, when the PDF is generated, then it contains all currently visible charts and metrics
- Background job for large exports
    - Given the export payload exceeds a defined threshold, when export is triggered, then a background job is queued and the user is notified upon completion
- Secure file storage for download links
    - Given a PDF is generated, when the download link is provided, then it is time-limited and accessible only to the requesting user

#### Acceptance Criteria
- Given an executive clicks "Export to PDF", when the export completes, then a PDF file containing current dashboard data is downloaded or delivered

---

### Requirement 4: Mobile Accessibility
#### User Story
As an executive, I want to see real-time metrics so that I can make data-driven decisions.
**Priority**: Should-have

#### Business Requirements

- Description: The dashboard must be fully usable on mobile devices for executives on the go
- Business Goal: Support flexible, location-independent decision-making
- User Value: Executives can monitor key metrics from their phone without needing a laptop
- Success Criteria: All dashboard views render correctly and are interactive on common mobile screen sizes

Requirements:
- Dashboard must render correctly on screens 375px wide and above
- All interactive elements must be touch-friendly

#### Technical Requirements

- Description: Responsive layout and touch-optimized UI components
- Type: Functional
- Dependencies: Responsive CSS framework, touch event handling
- Technical Notes: Test on iOS Safari and Android Chrome as primary mobile targets

Requirements:
- Responsive design implementation
    - Given the dashboard is opened on a 375px viewport, when the page loads, then all metric cards stack vertically without overflow
- Touch-friendly UI components
    - Given a user is on a touch device, when they interact with a chart, then tap targets meet the 44x44pt minimum size

#### Acceptance Criteria
- Given an executive opens the dashboard on a mobile device, when the page loads, then all metrics and charts are visible and interactive

---

### Requirement 5: Data Security
#### User Story
As an executive, I want to see real-time metrics so that I can make data-driven decisions.
**Priority**: Must-have

#### Business Requirements

- Description: Sensitive business metrics must be hidden from users who lack the appropriate authorization
- Business Goal: Protect competitive and confidential data from unauthorized disclosure
- User Value: Executives can trust that the dashboard enforces proper data governance
- Success Criteria: Unauthorized users see masked or placeholder values for restricted metrics

Requirements:
- Sensitive metric fields must be masked for users without the required role
- Masking must be enforced server-side, not only in the UI

#### Technical Requirements

- Description: Role-based data masking applied at the API response layer
- Type: Security
- Dependencies: RBAC module, audit logging service, encryption at rest
- Technical Notes: Never send sensitive raw values to unauthorized clients; apply masking in the API serializer

Requirements:
- Role-based data masking
    - Given a user without executive-level access requests the dashboard API, when the response is returned, then sensitive fields contain masked values
    - Given an executive-level user requests the dashboard API, when the response is returned, then all metric values are unmasked
- Audit logging for data access
    - Given any user accesses the dashboard, when the request is processed, then an audit log records the user, timestamp, and data categories accessed

#### Acceptance Criteria
- Given a non-authorized user views the dashboard, when sensitive metric panels are rendered, then the values are masked or hidden
- Given an authorized executive views the dashboard, when sensitive metric panels are rendered, then full data values are displayed
```

### Example 3: Integration Feature

**User Input**:
```
Feature: Third-Party CRM Integration
Context: Part of Q3 roadmap, depends on CRM API v2

User Story: As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.

Acceptance Criteria:
1. One-way sync from app to CRM
2. Sync occurs within 5 minutes of data change
3. Conflicts resolved by "last write wins" policy
4. Failed syncs retry 3 times with exponential backoff
5. Sync status visible in admin dashboard
6. Supports 10,000+ contacts without performance degradation
```

**Output**:
```markdown
## Requirements

### Requirement 1: Data Synchronization
#### User Story
As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.
**Priority**: Must-have

#### Business Requirements

- Description: Contact data created or modified in the app must be propagated to the CRM within a defined time window
- Business Goal: Keep CRM data current to support sales team effectiveness
- User Value: Sales reps work from a single source of truth without manual data entry in the CRM
- Success Criteria: Any contact change in the app appears in the CRM within 5 minutes

Requirements:
- The system must support one-way sync from the app to the CRM
- Sync must be triggered by any contact create, update, or delete event

#### Technical Requirements

- Description: Event-driven sync pipeline using CRM API v2 for outbound contact propagation
- Type: Functional, Integration
- Dependencies: CRM API v2, change data capture (CDC) mechanism, message broker
- Technical Notes: Use CDC or domain events to capture changes; decouple sync from the request cycle via a queue

Requirements:
- CRM API v2 integration
    - Given a contact is created in the app, when the sync pipeline processes the event, then the contact is created in the CRM via API v2
    - Given a contact is updated in the app, when the sync pipeline processes the event, then the CRM record reflects the latest values
- Change data capture for data modifications
    - Given any contact field is changed, when the change is committed, then a sync event is emitted within 1 minute
- Sync queue with message broker
    - Given a sync event is emitted, when it enters the queue, then it is processed in order with at-least-once delivery

#### Acceptance Criteria
- Given a contact is created or updated in the app, when the sync completes, then the contact data is present in the CRM
- Given a contact change is made, when 5 minutes have elapsed, then the CRM reflects the updated data

---

### Requirement 2: Conflict Resolution
#### User Story
As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.
**Priority**: Must-have

#### Business Requirements

- Description: A deterministic strategy must resolve cases where the same contact record is modified from multiple sources
- Business Goal: Prevent data inconsistencies that reduce CRM reliability
- User Value: Sales reps can trust the CRM reflects the most recent information
- Success Criteria: No manual resolution is required for sync conflicts; "last write wins" is applied automatically

Requirements:
- The system must apply "last write wins" conflict resolution based on modification timestamp
- All conflicts must be logged for audit purposes

#### Technical Requirements

- Description: Timestamp-based conflict detection and resolution at the sync layer
- Type: Functional
- Dependencies: Audit logging service, CRM API v2 (timestamp fields)
- Technical Notes: Ensure clocks are synchronized (NTP) across services to prevent false conflicts

Requirements:
- Timestamp-based conflict detection
    - Given two modifications to the same contact exist, when the sync runs, then the modification with the later timestamp is applied
- Last-write-wins conflict resolution logic
    - Given a conflict is detected, when it is resolved, then only the winning record is written to the CRM
- Conflict logging for audit purposes
    - Given a conflict is resolved, when the resolution is applied, then a log entry captures both versions and the resolution outcome

#### Acceptance Criteria
- Given simultaneous modifications exist for a contact, when the sync processes them, then the most recently modified version is saved to the CRM

---

### Requirement 3: Error Handling
#### User Story
As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.
**Priority**: Must-have

#### Business Requirements

- Description: Transient failures during sync must not result in data loss and must be recovered automatically
- Business Goal: Ensure eventual consistency between the app and CRM even in the presence of network or API errors
- User Value: Sales reps do not need to manually re-trigger failed syncs
- Success Criteria: Failed sync events are retried up to 3 times and escalated if all retries fail

Requirements:
- Failed sync operations must be retried automatically up to 3 times
- Retry attempts must use exponential backoff to avoid overwhelming the CRM API

#### Technical Requirements

- Description: Retry logic with exponential backoff and dead letter queue for persistent failures
- Type: Functional
- Dependencies: Message broker with retry support, alerting system
- Technical Notes: Use delays of 1m, 2m, 4m for the three retry attempts; route to DLQ after the third failure and trigger an alert

Requirements:
- Exponential backoff retry strategy (3 attempts)
    - Given a sync event fails, when the first retry fires, then it occurs after a 1-minute delay
    - Given the second retry also fails, when the third retry fires, then it occurs after a 4-minute delay
- Dead letter queue for failed syncs
    - Given all 3 retry attempts fail, when the event is exhausted, then it is moved to the dead letter queue
- Alerting for persistent failures
    - Given an event reaches the dead letter queue, when it is recorded, then an alert is sent to the operations team

#### Acceptance Criteria
- Given a sync event fails, when retried, then the system attempts the sync 3 times with exponential backoff before treating it as a failure

---

### Requirement 4: Admin Visibility
#### User Story
As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.
**Priority**: Should-have

#### Business Requirements

- Description: Administrators must have visibility into the health and history of the CRM sync pipeline
- Business Goal: Enable proactive monitoring and fast diagnosis of sync issues
- User Value: Admins can identify and resolve sync problems before they affect the sales team
- Success Criteria: Sync status and history are accessible in the admin dashboard in near real-time

Requirements:
- Admin dashboard must display current sync queue status and recent sync history
- Admins must be able to identify failed syncs and their root cause

#### Technical Requirements

- Description: Admin dashboard panel with real-time sync metrics and historical log view
- Type: Functional
- Dependencies: Sync pipeline metrics API, admin dashboard UI
- Technical Notes: Expose sync metrics via a dedicated API endpoint polled by the admin dashboard

Requirements:
- Admin dashboard with sync status metrics
    - Given an admin opens the sync panel, when the page loads, then queue depth, last sync time, and error count are displayed
- Sync history logging
    - Given a sync event completes (success or failure), when the result is recorded, then the event appears in the sync history log with status, timestamp, and error details if applicable
- Real-time status indicators
    - Given the admin dashboard is open, when the sync completes or fails, then the status indicator updates within 30 seconds

#### Acceptance Criteria
- Given an admin opens the sync dashboard, when the page loads, then current queue status and recent sync history are visible

---

### Requirement 5: Scalability
#### User Story
As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.
**Priority**: Must-have

#### Business Requirements

- Description: The sync pipeline must handle the current and projected contact volume without degrading performance
- Business Goal: Support business growth without requiring sync infrastructure redesign
- User Value: Sales reps experience consistent sync speed regardless of contact database size
- Success Criteria: Sync throughput and latency remain within SLA when processing 10,000+ contacts

Requirements:
- The sync pipeline must handle 10,000+ contacts without performance degradation
- Batch processing must be used for bulk operations to stay within CRM API rate limits

#### Technical Requirements

- Description: Paginated and batched sync processing with performance monitoring
- Type: Performance
- Dependencies: CRM API v2 (rate limits), performance monitoring system
- Technical Notes: Respect CRM API rate limits with request throttling; use pagination for initial full-sync and event-driven updates for incremental sync

Requirements:
- Pagination for large contact sets
    - Given 10,000+ contacts require a full sync, when the pipeline runs, then contacts are processed in pages without memory overflow
- Batch processing for bulk operations
    - Given a bulk import triggers a sync, when the pipeline processes the batch, then API calls are batched to stay within CRM rate limits
- Performance monitoring and alerting
    - Given sync throughput drops below the defined SLA, when the monitoring system detects this, then an alert is raised

#### Acceptance Criteria
- Given 10,000+ contacts exist, when a full sync is executed, then sync completes within the defined SLA without errors or performance degradation
```

## Tips for Best Results

- **Provide full context**: Include user story, priority, and stakeholder information
- **Be specific**: Vague acceptance criteria lead to unclear requirements
- **Mention constraints**: Call out timeline, budget, or technical constraints
- **Ask for clarification**: Flag ambiguous criteria rather than making assumptions
- **Iterate**: Requirements often need refinement through multiple passes

## Important Notes

- Always create a **new document** for the output (not requirements.md)
- If the user specifies a filename, use that filename
- Never modify or remove the existing requirements.md file
- Structure each requirement with the user story, business requirements, technical requirements, and acceptance criteria

## Related Use Cases

- Creating technical design documents from requirements
- Writing test cases from acceptance criteria
- Estimating sprint work from user stories
- Conducting architecture reviews
- Creating user documentation
- Preparing for stakeholder reviews

## Common Patterns

### Pattern 1: CRUD Operations
For create, read, update, delete features, ensure requirements cover:
- Validation rules
- Permission checks
- Error handling
- Audit logging
- Performance at scale

### Pattern 2: User Authentication
For auth-related features, ensure requirements cover:
- Security standards (OWASP compliance)
- Session management
- Password policies
- MFA requirements
- Account recovery

### Pattern 3: Data Processing
For data-heavy features, ensure requirements cover:
- Processing time limits
- Memory usage constraints
- Data format specifications
- Error recovery
- Data consistency guarantees