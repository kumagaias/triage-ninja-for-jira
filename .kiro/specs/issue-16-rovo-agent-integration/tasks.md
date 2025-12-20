# Implementation Plan: Rovo Agent Integration

## Task List

- [ ] 1. Implement Rovo Actions for ticket analysis
  - Create three action modules in manifest.yml
  - Implement backend functions for each action
  - Test actions independently
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

- [x] 1.1 Create analyze-ticket-classification action
  - Add action module to manifest.yml with key, name, function, actionVerb, description, and inputs
  - Define input: issueKey (string, required)
  - Reference function: analyzeTicketClassification
  - _Requirements: 1.1, 3.1_

- [x] 1.2 Implement analyzeTicketClassification function
  - Create function in src/index.ts
  - Extract issueKey from payload
  - Fetch ticket data using Jira API
  - Return structured data: summary, description, reporter, created, suggestedCategory, suggestedSubCategory, suggestedPriority, suggestedUrgency, reasoning
  - Add error handling and logging
  - _Requirements: 1.1, 1.2, 1.5, 4.1, 4.4, 5.1, 5.2, 5.3_

- [x] 1.3 Create suggest-ticket-assignee action
  - Add action module to manifest.yml
  - Define inputs: issueKey (string, required), category (string, required)
  - Reference function: suggestTicketAssignee
  - _Requirements: 2.1, 3.1_

- [x] 1.4 Implement suggestTicketAssignee function
  - Create function in src/index.ts
  - Extract issueKey and category from payload
  - Fetch available agents from Jira
  - Calculate workload for each agent (count of open tickets)
  - Return structured data: issueKey, category, availableAgents with workload, recommendation, reasoning
  - Add error handling and logging
  - _Requirements: 2.1, 2.2, 2.4, 4.1, 4.4, 5.1, 5.2, 5.3_

- [x] 1.5 Create find-similar-tickets action
  - Add action module to manifest.yml
  - Define input: issueKey (string, required)
  - Reference function: findSimilarTickets
  - _Requirements: 3.1_

- [x] 1.6 Implement findSimilarTickets function
  - Create function in src/index.ts
  - Extract issueKey from payload
  - Fetch current ticket data
  - Search for similar tickets using JQL
  - Calculate similarity scores
  - Return top 3 similar tickets with solutions
  - Add error handling and logging
  - _Requirements: 4.1, 4.4, 5.1, 5.2, 5.3_

- [x] 1.7 Add action references to rovo:agent module
  - Update manifest.yml rovo:agent module
  - Add actions array with three action keys
  - Verify manifest syntax with forge lint
  - _Requirements: 3.1_

- [ ] 2. Create Jira Automation rules
  - Document automation rule configurations
  - Provide setup instructions for users
  - Test automation rules in Jira
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 2.1 Document automatic triage automation rule
  - Create docs/automation-rules.md
  - Document trigger: Issue Created
  - Document conditions: Issue type, Assignee empty
  - Document actions: Invoke Rovo Agent, Update issue fields
  - Provide step-by-step setup instructions
  - _Requirements: 1.1, 2.1_

- [ ] 2.2 Document manual triage automation rule
  - Add to docs/automation-rules.md
  - Document trigger: Issue Updated (label added)
  - Document conditions: Label "run-ai-triage" added
  - Document actions: Invoke Rovo Agent, Update issue, Remove label
  - Provide step-by-step setup instructions
  - _Requirements: 1.1, 2.1_

- [ ] 2.3 Create automation rule templates
  - Create JSON templates for both rules
  - Include all necessary fields and configurations
  - Add comments explaining each section
  - _Requirements: 1.1, 2.1_

- [ ] 3. Update frontend for manual triage trigger
  - Modify issue panel UI to trigger automation
  - Implement polling mechanism for completion
  - Add error handling and fallback logic
  - _Requirements: 1.1, 2.1, 4.1, 4.2, 4.3_

- [ ] 3.1 Create addLabelToIssue resolver function
  - Add function to src/index.ts
  - Accept issueKey and label parameters
  - Call Jira API to add label
  - Return success/failure status
  - Add error handling
  - _Requirements: 4.1, 4.4, 5.1, 5.2, 5.3_

- [ ] 3.2 Update "Run AI Triage" button handler
  - Modify static/issue-panel/src/App.js
  - Call addLabelToIssue resolver with "run-ai-triage" label
  - Show loading state while processing
  - Implement polling to detect completion (label removed)
  - Refresh issue data after completion
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 3.3 Implement polling mechanism
  - Create pollForTriageCompletion function
  - Poll every 2 seconds for label removal
  - Timeout after 30 seconds
  - Return success when label is removed
  - _Requirements: 4.2_

- [ ] 3.4 Add fallback error handling
  - Catch errors from automation trigger
  - Log error details
  - Fall back to keyword-based triage
  - Show appropriate error message to user
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 5.4_

- [ ] 4. Enhance logging and monitoring
  - Add comprehensive logging for all Rovo Agent interactions
  - Track success/failure rates
  - Monitor API usage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 4.1 Add logging to action functions
  - Log action invocation with payload (sanitized)
  - Log successful responses with summary
  - Log errors with full context
  - Log fallback usage
  - Include timestamps in all logs
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 4.2 Implement usage tracking
  - Create tracking object for metrics
  - Track successful Rovo Agent calls
  - Track failed calls and fallback usage
  - Track average confidence scores
  - Log metrics periodically
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Update documentation
  - Document Rovo Agent integration architecture
  - Provide setup instructions for automation rules
  - Document prompt engineering guidelines
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5.1 Create Rovo Agent integration guide
  - Create docs/rovo-agent-integration.md
  - Document architecture and data flow
  - Explain three-tier triage system
  - Document Rovo Actions and their purposes
  - _Requirements: 7.1, 7.2_

- [ ] 5.2 Document automation rule setup
  - Add to docs/rovo-agent-integration.md
  - Step-by-step instructions for creating rules
  - Screenshots of Jira Automation UI
  - Troubleshooting common issues
  - _Requirements: 7.1, 7.2_

- [ ] 5.3 Document prompt engineering
  - Create docs/prompt-engineering.md
  - Document prompt structure for classification
  - Document prompt structure for assignee suggestion
  - Provide examples of expected JSON responses
  - Document edge case handling
  - Provide optimization guidelines
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5.4 Update README.md
  - Add Rovo Agent integration section
  - Explain automatic and manual triage modes
  - Link to detailed documentation
  - Update architecture diagram
  - _Requirements: 7.1, 7.2_

- [ ] 6. Testing and validation
  - Test all Rovo Actions independently
  - Test automation rules end-to-end
  - Test fallback scenarios
  - Validate error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6.1 Test analyze-ticket-classification action
  - Create test tickets with various categories
  - Invoke action manually
  - Verify response structure and data
  - Test error scenarios (invalid issueKey, API failures)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.4_

- [ ] 6.2 Test suggest-ticket-assignee action
  - Create test tickets with different categories
  - Invoke action manually
  - Verify workload calculation accuracy
  - Verify assignee recommendation logic
  - Test error scenarios
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.4_

- [ ] 6.3 Test find-similar-tickets action
  - Create test tickets with similar content
  - Invoke action manually
  - Verify similarity scoring
  - Verify top 3 results
  - Test error scenarios
  - _Requirements: 4.1, 4.4_

- [ ] 6.4 Test automatic triage automation rule
  - Create new test tickets
  - Verify automation triggers
  - Verify Rovo Agent is invoked
  - Verify ticket fields are updated
  - Test with various ticket types
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 6.5 Test manual triage automation rule
  - Add "run-ai-triage" label to test tickets
  - Verify automation triggers
  - Verify Rovo Agent is invoked
  - Verify label is removed after completion
  - Verify ticket fields are updated
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 6.6 Test fallback scenarios
  - Disable Rovo Agent temporarily
  - Trigger manual triage
  - Verify fallback to keyword-based logic
  - Verify error messages are appropriate
  - Verify system remains functional
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Deploy and verify
  - Deploy to production environment
  - Verify all components are working
  - Monitor logs for errors
  - Collect initial metrics
  - _Requirements: All_

- [ ] 7.1 Deploy to Forge
  - Run forge deploy --non-interactive -e production
  - Verify deployment success
  - Check forge logs for errors
  - _Requirements: All_

- [ ] 7.2 Verify Rovo Actions are available
  - Check Jira Automation UI for available actions
  - Verify actions appear in Rovo Agent action list
  - Test invoking actions from automation rules
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 7.3 Monitor initial usage
  - Monitor forge logs for action invocations
  - Track success/failure rates
  - Collect confidence score data
  - Identify any issues or errors
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7.4 Create user documentation
  - Write user guide for setting up automation rules
  - Create video tutorial (optional)
  - Publish documentation to wiki or README
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Notes

- All tasks should be completed in order
- Each task should be tested before moving to the next
- Fallback logic must remain functional throughout implementation
- Logging should be comprehensive for debugging and monitoring
- Documentation should be clear and include examples
