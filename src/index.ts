/**
 * Main entry point for TriageNinja Forge app
 * 
 * This file exports all handlers and actions for the Forge app.
 * The actual implementations are split into separate modules for maintainability.
 */

// Export resolver handlers
export { dashboardHandler } from './resolvers/dashboardResolver';
export { issuePanelHandler } from './resolvers/issuePanelResolver';
export { changeAssignee } from './resolvers/changeAssigneeResolver';

// Export Trigger handlers
export { autoTriageTriggerHandler } from './triggers/autoTriageTrigger';

// Export Automation Action handler
export { automationAutoTriageHandler } from './resolvers/automationActionResolver';
