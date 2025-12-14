import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

// Helper function to get confidence color based on score
const getConfidenceColor = (confidence) => {
  if (confidence >= 80) {
    return {
      background: '#E3FCEF',
      border: '#00875A'
    };
  } else if (confidence >= 60) {
    return {
      background: '#FFF0B3',
      border: '#FF991F'
    };
  } else {
    return {
      background: '#FFEBE6',
      border: '#FF5630'
    };
  }
};

// Add CSS for hover effects
const styles = `
  .run-triage-button:hover:not(:disabled) {
    background-color: #0747A6 !important;
  }
  
  .approve-button:hover:not(:disabled) {
    background-color: #0747A6 !important;
  }
  
  .reject-button:hover:not(:disabled) {
    background-color: #C1C7D0 !important;
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

/**
 * AI Triage Panel Component
 * Displays AI-powered triage analysis for Jira issues
 */
function App() {
  const [issueDetails, setIssueDetails] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Use refs to track timers and prevent race conditions
  const progressIntervalRef = React.useRef(null);
  const timeoutIdRef = React.useRef(null);
  const progressResetTimeoutRef = React.useRef(null);
  const isCancelledRef = React.useRef(false);

  // Fetch issue details on component mount
  useEffect(() => {
    const fetchIssueDetails = async () => {
      try {
        const details = await invoke('getIssueDetails');
        setIssueDetails(details);
      } catch (err) {
        console.error('Failed to fetch issue details:', err);
        setError('Failed to load issue details');
      }
    };
    fetchIssueDetails();
  }, []);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (progressResetTimeoutRef.current) {
        clearTimeout(progressResetTimeoutRef.current);
      }
    };
  }, []);

  // Run AI triage analysis with timeout and progress
  const handleRunTriage = async () => {
    // Defensive check: ensure issueDetails is loaded
    if (!issueDetails) {
      setError('Issue details not loaded. Please refresh the page.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    isCancelledRef.current = false;
    
    // Clear any existing timers
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (progressResetTimeoutRef.current) clearTimeout(progressResetTimeoutRef.current);
    
    // Non-linear progress simulation with easing
    // Progress reaches 90% over 27 seconds, leaving 3 seconds buffer
    const startTime = Date.now();
    const duration = 27000; // 27 seconds to reach 90%
    
    progressIntervalRef.current = setInterval(() => {
      if (isCancelledRef.current) {
        clearInterval(progressIntervalRef.current);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      // Ease-out cubic function for smooth deceleration
      const easedRatio = 1 - Math.pow(1 - ratio, 3);
      const newProgress = Math.min(Math.floor(easedRatio * 90), 90);
      
      setProgress(newProgress);
      
      if (newProgress >= 90) {
        clearInterval(progressIntervalRef.current);
      }
    }, 100);
    
    // Timeout after 30 seconds
    timeoutIdRef.current = setTimeout(() => {
      if (isCancelledRef.current) return;
      
      isCancelledRef.current = true;
      clearInterval(progressIntervalRef.current);
      setLoading(false);
      setProgress(0);
      setError('Analysis timed out after 30 seconds. Please try again.');
    }, 30000);
    
    try {
      // Pass issue details to the AI triage function
      const result = await invoke('runAITriage', {
        issueKey: issueDetails.key,
        summary: issueDetails.summary,
        description: issueDetails.description || '',
        reporter: issueDetails.reporter?.displayName || 'Unknown',
        created: issueDetails.created
      });
      
      // Only process result if not cancelled
      if (!isCancelledRef.current) {
        clearTimeout(timeoutIdRef.current);
        clearInterval(progressIntervalRef.current);
        setProgress(100);
        setTriageResult(result);
        setLoading(false);
        
        // Store timeout ID for cleanup
        progressResetTimeoutRef.current = setTimeout(() => {
          if (!isCancelledRef.current) {
            setProgress(0);
          }
        }, 500);
      }
    } catch (err) {
      // Only show error if not cancelled
      if (!isCancelledRef.current) {
        clearTimeout(timeoutIdRef.current);
        clearInterval(progressIntervalRef.current);
        console.error('Failed to run AI triage:', err);
        setError('Failed to analyze ticket. Please try again.');
        setLoading(false);
        setProgress(0);
      }
    }
  };

  // Show confirmation dialog
  const handleApproveClick = () => {
    setShowConfirmDialog(true);
  };

  // Handle approve action after confirmation
  const handleApproveConfirm = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    setError(null);
    
    try {
      await invoke('applyTriageResult', {
        issueKey: issueDetails.key,
        priority: triageResult.priority,
        assigneeId: triageResult.suggestedAssignee.id,
        category: triageResult.category,
        subCategory: triageResult.subCategory
      });
      
      // Show success message
      setSuccessMessage({
        priority: triageResult.priority,
        assignee: triageResult.suggestedAssignee.name,
        category: triageResult.category,
        subCategory: triageResult.subCategory
      });
      
      // Clear the result
      setTriageResult(null);
      
      // Reload issue details in the panel
      const details = await invoke('getIssueDetails');
      setIssueDetails(details);
    } catch (err) {
      console.error('Failed to apply triage result:', err);
      setError('Failed to apply triage result. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel confirmation dialog
  const handleApproveCancel = () => {
    setShowConfirmDialog(false);
  };

  // Handle reject action
  const handleReject = () => {
    // Clear the triage result and allow user to run again
    setTriageResult(null);
  };

  if (!issueDetails) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading issue details...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ 
        marginTop: 0, 
        color: '#172B4D', 
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🥷</span>
        <span>AI Triage</span>
      </h2>
      
      {!triageResult && (
        <div>
          <div style={{
            padding: '10px',
            backgroundColor: '#F4F5F7',
            borderRadius: '3px',
            marginBottom: '12px',
            fontSize: '13px'
          }}>
            <div style={{ color: '#5E6C84', marginBottom: '4px' }}>
              Status:
            </div>
            <div style={{ color: '#172B4D', fontWeight: 'bold' }}>
              Not Triaged
            </div>
          </div>
          <button
            onClick={handleRunTriage}
            disabled={loading}
            className="run-triage-button"
            aria-busy={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#DFE1E6' : '#0052CC',
              color: loading ? '#5E6C84' : 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '🤖 Analyzing...' : '🤖 Run AI Triage'}
          </button>
          
          {/* Progress Bar */}
          {loading && progress > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div 
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={progress}
                aria-label="Analysis progress"
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#DFE1E6',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#0052CC',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
                textAlign: 'center'
              }}>
                Analyzing... {progress}%
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#FFEBE6',
          border: '1px solid #FF5630',
          borderRadius: '3px',
          marginTop: '10px',
          color: '#BF2600'
        }}>
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '12px',
          backgroundColor: '#E3FCEF',
          border: '1px solid #00875A',
          borderRadius: '3px',
          marginTop: '10px',
          color: '#006644'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            ✅ Triage result applied successfully!
          </div>
          <div style={{ fontSize: '12px', marginBottom: '4px' }}>
            The issue has been updated with:
          </div>
          <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '12px' }}>
            <li>Priority: <strong>{successMessage.priority}</strong></li>
            <li>Assignee: <strong>{successMessage.assignee}</strong></li>
            <li>Labels: <strong>{successMessage.category}, {successMessage.subCategory}</strong></li>
          </ul>
          <div style={{ fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
            🔄 Refresh the page to see changes in the main issue view
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#00875A',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {triageResult && (
        <div style={{ marginTop: '16px' }}>
          {/* Confidence Score */}
          <div style={{
            padding: '12px',
            backgroundColor: getConfidenceColor(triageResult.confidence).background,
            borderRadius: '3px',
            marginBottom: '15px',
            border: `1px solid ${getConfidenceColor(triageResult.confidence).border}`
          }}>
            <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: '4px' }}>
              Confidence Score
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#172B4D' }}>
              {triageResult.confidence}%
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '13px', color: '#172B4D', marginBottom: '8px', fontWeight: 'bold' }}>
              📁 Category
            </h3>
            <div style={{
              padding: '8px',
              backgroundColor: '#F4F5F7',
              borderRadius: '3px',
              fontSize: '13px'
            }}>
              <span style={{ color: '#172B4D', fontWeight: '500' }}>
                {triageResult.category}
              </span>
              <span style={{ color: '#5E6C84', margin: '0 6px' }}>›</span>
              <span style={{ color: '#5E6C84' }}>
                {triageResult.subCategory}
              </span>
            </div>
          </div>

          {/* Priority & Urgency */}
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '13px', color: '#172B4D', marginBottom: '8px', fontWeight: 'bold' }}>
              ⚡ Priority & Urgency
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#F4F5F7',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#5E6C84', marginBottom: '4px' }}>Priority</div>
                <div style={{ color: '#172B4D', fontWeight: 'bold' }}>{triageResult.priority}</div>
              </div>
              <div style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#F4F5F7',
                borderRadius: '3px',
                fontSize: '12px'
              }}>
                <div style={{ color: '#5E6C84', marginBottom: '4px' }}>Urgency</div>
                <div style={{ color: '#172B4D', fontWeight: 'bold' }}>{triageResult.urgency}</div>
              </div>
            </div>
          </div>

          {/* Suggested Assignee */}
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '13px', color: '#172B4D', marginBottom: '8px', fontWeight: 'bold' }}>
              👤 Suggested Assignee
            </h3>
            <div style={{
              padding: '10px',
              backgroundColor: '#DEEBFF',
              borderRadius: '3px',
              border: '1px solid #B3D4FF'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#172B4D', marginBottom: '6px' }}>
                {triageResult.suggestedAssignee.name}
              </div>
              <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: '4px' }}>
                ✓ {triageResult.suggestedAssignee.reason}
              </div>
              <div style={{ fontSize: '11px', color: '#5E6C84' }}>
                ⏱️ Avg resolution: {triageResult.suggestedAssignee.estimatedTime}
              </div>
            </div>
          </div>

          {/* Similar Tickets */}
          {triageResult.similarTickets && triageResult.similarTickets.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '13px', color: '#172B4D', marginBottom: '8px', fontWeight: 'bold' }}>
                🔍 Similar Tickets ({triageResult.similarTickets.length})
              </h3>
              {triageResult.similarTickets.slice(0, 3).map((ticket, index) => (
                <div key={index} style={{
                  padding: '8px',
                  backgroundColor: '#F4F5F7',
                  borderRadius: '3px',
                  marginBottom: '6px',
                  fontSize: '11px',
                  border: '1px solid #DFE1E6'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#172B4D', marginBottom: '4px' }}>
                    {ticket.id} 
                    <span style={{ 
                      marginLeft: '6px',
                      padding: '2px 6px',
                      backgroundColor: '#E3FCEF',
                      borderRadius: '3px',
                      fontSize: '10px',
                      color: '#00875A'
                    }}>
                      {Math.round(ticket.similarity * 100)}% similar
                    </span>
                  </div>
                  <div style={{ color: '#5E6C84' }}>
                    {ticket.solution}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reasoning */}
          {triageResult.reasoning && (
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ fontSize: '13px', color: '#172B4D', marginBottom: '8px', fontWeight: 'bold' }}>
                💡 Reasoning
              </h3>
              <div style={{
                padding: '10px',
                backgroundColor: '#F4F5F7',
                borderRadius: '3px',
                fontSize: '12px',
                color: '#5E6C84',
                lineHeight: '1.5'
              }}>
                {triageResult.reasoning}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }} aria-live="polite">
            <button
              onClick={handleApproveClick}
              disabled={loading}
              className="approve-button"
              aria-busy={loading}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: loading ? '#DFE1E6' : '#0052CC',
                color: loading ? '#5E6C84' : 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Applying...' : 'Approve & Apply'}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="reject-button"
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#DFE1E6',
                color: '#172B4D',
                border: 'none',
                borderRadius: '3px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && triageResult && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 30, 66, 0.54)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '3px',
            padding: '20px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 16px rgba(9, 30, 66, 0.25)'
          }}>
            <h3 
              id="confirm-dialog-title"
              style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                color: '#172B4D',
                fontWeight: 'bold'
              }}>
              Confirm Triage Application
            </h3>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              color: '#5E6C84',
              lineHeight: '1.5'
            }}>
              Are you sure you want to apply the following changes to this issue?
            </p>
            <ul style={{
              margin: '0 0 20px 0',
              paddingLeft: '20px',
              fontSize: '13px',
              color: '#172B4D'
            }}>
              <li>Priority: <strong>{triageResult?.priority || 'N/A'}</strong></li>
              <li>Assignee: <strong>{triageResult?.suggestedAssignee?.name || 'N/A'}</strong></li>
              <li>Labels: <strong>{triageResult?.category || 'N/A'}, {triageResult?.subCategory || 'N/A'}</strong></li>
            </ul>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleApproveCancel}
                aria-label="Cancel triage application"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#DFE1E6',
                  color: '#172B4D',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                className="approve-button"
                aria-label="Confirm triage application"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0052CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
