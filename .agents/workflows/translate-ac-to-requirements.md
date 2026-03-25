---
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
**User Story:** As a [role], I want to [action] so that [benefit]

#### Business Requirements
- [Business requirement 1]
- [Business requirement 2]

#### Technical Requirements
- [Technical requirement 1]
- [Technical requirement 2]

#### Acceptance Criteria
- [Acceptance criterion 1]
- [Acceptance criterion 2]

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
**User Story:** As a project manager, I want to assign tasks to team members so that work is distributed properly.

#### Business Requirements
- Team members must be easily discoverable for assignment
- Clear visibility of task ownership improves accountability

#### Technical Requirements
- User dropdown component with search functionality
- Real-time user list from authentication service
- Task card UI component to display assignee

#### Acceptance Criteria
- Task assignment dropdown shows all team members
- Selected assignee is displayed on the task card

---

### Requirement 2: Assignment Notifications
**User Story:** As a project manager, I want to assign tasks to team members so that work is distributed properly.

#### Business Requirements
- Assignees should be promptly notified of new tasks
- Notification ensures timely awareness of work assignments

#### Technical Requirements
- Email notification service integration
- Async notification queue for reliability

#### Acceptance Criteria
- Email notification sent to assignee when task is assigned

---

### Requirement 3: Assignment Modification
**User Story:** As a project manager, I want to assign tasks to team members so that work is distributed properly.

#### Business Requirements
- Task assignments need flexibility for corrections
- Proper authorization ensures assignment integrity

#### Technical Requirements
- Role-based access control (task owner, admin)
- Audit logging for assignment changes

#### Acceptance Criteria
- Assignment can be changed by task owner or admin
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
**User Story:** As an executive, I want to see real-time metrics so that I can make data-driven decisions.

#### Business Requirements
- Executives need quick access to metrics for time-sensitive decisions
- Fast load times improve user adoption and productivity

#### Technical Requirements
- Optimized data aggregation queries
- Caching layer for frequently accessed metrics
- CDN for static assets

#### Acceptance Criteria
- Dashboard loads within 3 seconds

---

### Requirement 2: Real-time Data Updates
**User Story:** As an executive, I want to see real-time metrics so that I can make data-driven decisions.

#### Business Requirements
- Decisions require current data for accuracy
- Automatic updates reduce manual refresh needs

#### Technical Requirements
- WebSocket or Server-Sent Events for live updates
- Data refresh interval configuration (30 seconds)
- Efficient change detection to minimize load

#### Acceptance Criteria
- Metrics update automatically every 30 seconds

---

### Requirement 3: Data Export
**User Story:** As an executive, I want to see real-time metrics so that I can make data-driven decisions.

#### Business Requirements
- Board meetings require shareable documentation
- PDF format ensures consistent presentation

#### Technical Requirements
- PDF generation library integration
- Background job for large exports
- Secure file storage for download links

#### Acceptance Criteria
- Data can be exported to PDF for board meetings

---

### Requirement 4: Mobile Accessibility
**User Story:** As an executive, I want to see real-time metrics so that I can make data-driven decisions.

#### Business Requirements
- Executives need access to metrics while traveling
- Mobile access supports flexible work environments

#### Technical Requirements
- Responsive design implementation
- Touch-friendly UI components
- Progressive Web App for offline access

#### Acceptance Criteria
- Dashboard is accessible on mobile devices

---

### Requirement 5: Data Security
**User Story:** As an executive, I want to see real-time metrics so that I can make data-driven decisions.

#### Business Requirements
- Sensitive business data must be protected
- Unauthorized access could harm competitive position

#### Technical Requirements
- Role-based data masking
- Audit logging for data access
- Encryption at rest and in transit

#### Acceptance Criteria
- Sensitive data is masked for unauthorized viewers
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
**User Story:** As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.

#### Business Requirements
- CRM data must reflect current customer information
- One-way sync reduces complexity and potential conflicts

#### Technical Requirements
- CRM API v2 integration
- Change data capture (CDC) for data modifications
- Sync queue with message broker

#### Acceptance Criteria
- One-way sync from app to CRM
- Sync occurs within 5 minutes of data change

---

### Requirement 2: Conflict Resolution
**User Story:** As a sales rep, I want to sync contacts with our CRM so that I have up-to-date customer information.

#### Business Requirements
- Clear resolution strategy prevents data inconsistencies
- Simplicity in conflict handling reduces support overhead

#### Technical Requirements
- Timestamp-based conflict detection
- Last-write-wins conflict resolution logic
- Conflict logging for audit purposes

#### Acceptance Criteria
- Conflicts resolved by "last write wins" policy