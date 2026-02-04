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

// Export Rovo Action handlers
import * as RovoActions from './actions/rovoActions';

export async function analyzeTicketClassificationHandler(event: any, context: any) {
  return await RovoActions.analyzeTicketClassification(event.payload, context);
}

export async function suggestTicketAssigneeHandler(event: any, context: any) {
  return await RovoActions.suggestTicketAssignee(event.payload, context);
}

export async function findSimilarTicketsHandler(event: any, context: any) {
  return await RovoActions.findSimilarTickets(event.payload, context);
}
