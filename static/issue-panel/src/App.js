import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

/**
 * AI Triage Panel Component
 * Displays AI-powered triage analysis for Jira issues
 */
function App() {
  const [issueDetails, setIssueDetails] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Run AI triage analysis
  const handleRunTriage = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('runAITriage');
      setTriageResult(result);
    } catch (err) {
      console.error('Failed to run AI triage:', err);
      setError('Failed to analyze ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle approve action
  const handleApprove = async () => {
    // TODO: Implement approve logic in later tasks
    // - Save triage result to Forge Storage
    // - Update issue with category, priority, assignee
    console.log('Approved triage result:', triageResult);
    setTriageResult(null);
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
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginTop: 0, color: '#172B4D' }}>🥷 AI Triage</h2>
      
      {!triageResult && (
        <div>
          <p style={{ color: '#5E6C84' }}>
            Status: <strong>Not Triaged</strong>
          </p>
          <button
            onClick={handleRunTriage}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#DFE1E6' : '#0052CC',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? '🤖 Analyzing...' : '🤖 Run AI Triage'}
          </button>
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

      {triageResult && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            padding: '10px',
            backgroundColor: '#E3FCEF',
            borderRadius: '3px',
            marginBottom: '15px'
          }}>
            <strong>Confidence:</strong> {triageResult.confidence}%
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#172B4D' }}>📁 Category</h3>
            <p style={{ margin: '5px 0', color: '#5E6C84' }}>
              {triageResult.category} &gt; {triageResult.subCategory}
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#172B4D' }}>⚡ Priority & Urgency</h3>
            <p style={{ margin: '5px 0', color: '#5E6C84' }}>
              Priority: <strong>{triageResult.priority}</strong><br/>
              Urgency: <strong>{triageResult.urgency}</strong>
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#172B4D' }}>👤 Suggested Assignee</h3>
            <div style={{
              padding: '10px',
              backgroundColor: '#F4F5F7',
              borderRadius: '3px'
            }}>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                {triageResult.suggestedAssignee.name}
              </p>
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#5E6C84' }}>
                ✓ {triageResult.suggestedAssignee.reason}
              </p>
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#5E6C84' }}>
                ⏱️ Avg resolution: {triageResult.suggestedAssignee.estimatedTime}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleApprove}
              style={{
                width: '48%',
                padding: '10px',
                backgroundColor: '#0052CC',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: 'pointer',
                marginRight: '4%'
              }}
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              style={{
                width: '48%',
                padding: '10px',
                backgroundColor: '#DFE1E6',
                color: '#172B4D',
                border: 'none',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
