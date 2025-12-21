/**
 * Main entry point for TriageNinja Forge app
 * 
 * This file exports all handlers and actions for the Forge app.
 * The actual implementations are split into separate modules for maintainability.
 */

// Export resolver handlers
export { dashboardHandler } from './resolvers/dashboardResolver';
export { issuePanelHandler } from './resolvers/issuePanelResolver';

// Export Rovo actions
export {
  analyzeTicketClassification,
  suggestTicketAssignee,
  findSimilarTickets
} from './actions/rovoActions';
