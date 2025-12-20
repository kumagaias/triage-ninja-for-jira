# Requirements Document

## Introduction

This specification defines the integration of Atlassian Rovo Agent API into TriageNinja for Jira to enable AI-powered ticket classification and assignee suggestion. Currently, the system uses keyword-based classification and workload-based assignment as fallback mechanisms. This integration will leverage Rovo Agent's advanced AI capabilities to provide more accurate and context-aware recommendations.

## Glossary

- **Rovo Agent**: Atlassian's AI service that provides natural language processing and decision-making capabilities
- **TriageNinja**: The Forge application for automated Jira ticket triage
- **Ticket Classification**: The process of categorizing tickets into predefined categories and subcategories
- **Assignee Suggestion**: The process of recommending the most suitable team member to handle a ticket
- **Forge API**: Atlassian's platform API for building cloud apps
- **Resolver**: Backend function in Forge that handles data processing and API calls
- **Confidence Score**: A numerical value (0-100) indicating the AI's certainty in its recommendation

## Requirements

### Requirement 1

**User Story:** As a support team lead, I want the system to use Rovo Agent for ticket classification, so that tickets are categorized more accurately based on AI analysis rather than simple keyword matching.

#### Acceptance Criteria

1. WHEN a ticket is analyzed for classification, THE system SHALL invoke the Rovo Agent API with the ticket summary and description
2. WHEN the Rovo Agent API returns a classification result, THE system SHALL parse the response and extract category, subcategory, priority, urgency, confidence score, reasoning, and tags
3. IF the Rovo Agent API call fails or times out, THEN THE system SHALL fall back to keyword-based classification
4. WHEN using Rovo Agent classification, THE system SHALL achieve a confidence score of at least 70% for valid classifications
5. WHEN the classification is complete, THE system SHALL log whether Rovo Agent or fallback logic was used

### Requirement 2

**User Story:** As a support team lead, I want the system to use Rovo Agent for assignee suggestions, so that tickets are assigned to the most suitable team member based on skills, workload, and historical performance.

#### Acceptance Criteria

1. WHEN a ticket needs assignee suggestion, THE system SHALL invoke the Rovo Agent API with ticket category, available agents, their skills, current workload, and historical performance data
2. WHEN the Rovo Agent API returns an assignee suggestion, THE system SHALL parse the response and extract assignee name, assignee ID, reason, confidence score, estimated resolution time, and alternative assignees
3. IF the Rovo Agent API call fails or times out, THEN THE system SHALL fall back to workload-based selection
4. WHEN using Rovo Agent suggestion, THE system SHALL consider agent skills matching the ticket category
5. WHEN the suggestion is complete, THE system SHALL log whether Rovo Agent or fallback logic was used

### Requirement 3

**User Story:** As a developer, I want to understand the correct Rovo Agent API invocation method in Forge, so that I can implement the integration without trial-and-error.

#### Acceptance Criteria

1. THE system SHALL use the officially documented Forge API method for invoking Rovo Agent
2. THE system SHALL NOT use `api.asApp().requestRovo()` as this method does not exist in the Forge API
3. THE system SHALL research and document the correct API method (e.g., `api.asApp().requestGraph()`, custom REST endpoint, or other official method)
4. THE system SHALL include proper error handling for API invocation failures
5. THE system SHALL validate API responses before processing

### Requirement 4

**User Story:** As a system administrator, I want the Rovo Agent integration to handle errors gracefully, so that the system remains functional even when the AI service is unavailable.

#### Acceptance Criteria

1. WHEN the Rovo Agent API is unavailable, THE system SHALL fall back to existing keyword-based and workload-based logic
2. WHEN an API call times out after 5 seconds, THE system SHALL log the timeout and use fallback logic
3. WHEN an API response is malformed or invalid, THE system SHALL log the error and use fallback logic
4. WHEN using fallback logic, THE system SHALL indicate lower confidence scores (50-60%)
5. THE system SHALL NOT crash or return errors to the user when Rovo Agent fails

### Requirement 5

**User Story:** As a developer, I want comprehensive logging for Rovo Agent interactions, so that I can debug issues and monitor API usage.

#### Acceptance Criteria

1. WHEN invoking Rovo Agent API, THE system SHALL log the request payload (excluding sensitive data)
2. WHEN receiving a response from Rovo Agent, THE system SHALL log the response status and summary
3. WHEN an error occurs, THE system SHALL log the error type, message, and stack trace
4. WHEN falling back to non-AI logic, THE system SHALL log the reason for fallback
5. THE system SHALL include timestamps in all log entries

### Requirement 6

**User Story:** As a product owner, I want to track Rovo Agent usage and accuracy, so that I can measure the value of the AI integration.

#### Acceptance Criteria

1. THE system SHALL track the number of successful Rovo Agent API calls
2. THE system SHALL track the number of failed API calls and fallback usage
3. THE system SHALL track average confidence scores for AI-powered classifications
4. THE system SHALL track average confidence scores for AI-powered assignee suggestions
5. THE system SHALL expose these metrics through console logs for monitoring

### Requirement 7

**User Story:** As a developer, I want clear documentation on Rovo Agent prompt engineering, so that I can optimize the AI's performance for ticket triage.

#### Acceptance Criteria

1. THE system SHALL document the prompt structure used for ticket classification
2. THE system SHALL document the prompt structure used for assignee suggestion
3. THE system SHALL include examples of expected JSON response formats
4. THE system SHALL document how to handle edge cases (empty descriptions, special characters, etc.)
5. THE system SHALL provide guidelines for prompt optimization based on testing results
