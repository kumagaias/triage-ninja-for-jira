import React, { useEffect, useState } from 'react';
import { invoke, view, router } from '@forge/bridge';
import { getTranslations } from './i18n';
import './App.css';

// Priority color mapping - moved outside component to avoid recreation on each render
const PRIORITY_COLORS = {
  Highest: '#FF5630',
  High: '#FF8B00',
  Medium: '#FFAB00',
  Low: '#36B37E',
  Lowest: '#00B8D9'
};

/**
 * TriageNinja Dashboard Component
 * Displays triage statistics and untriaged tickets
 */
function App() {
  const [statistics, setStatistics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [locale, setLocale] = useState('en');
  const [filters, setFilters] = useState({
    assignee: 'untriaged', // New filter: 'all' or 'untriaged'
    priority: 'all',
    dateRange: 'all'
  });
  const [triageModal, setTriageModal] = useState({
    isOpen: false,
    ticket: null,
    loading: false,
    result: null,
    error: null
  });
  
  const t = getTranslations(locale);

  // Get user locale on mount
  useEffect(() => {
    const getUserLocale = async () => {
      try {
        const context = await view.getContext();
        setLocale(context.locale || 'en');
      } catch (err) {
        console.error('Failed to get user locale:', err);
        setLocale('en');
      }
    };
    
    getUserLocale();
  }, []);

  // Fetch statistics on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const stats = await invoke('getStatistics');
        setStatistics(stats);
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchStats();
    
    // Auto-refresh statistics every 30 seconds
    const intervalId = setInterval(fetchStats, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch tickets when assignee filter changes
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoadingTickets(true);
        const ticketList = await invoke('getTickets', { filter: filters.assignee });
        setTickets(ticketList);
        setFilteredTickets(ticketList);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoadingTickets(false);
      }
    };
    
    fetchTickets();
    
    // Auto-refresh tickets every 30 seconds
    const intervalId = setInterval(fetchTickets, 30000);
    
    return () => clearInterval(intervalId);
  }, [filters.assignee]);

  // Apply filters when tickets or filter settings change
  useEffect(() => {
    let filtered = [...tickets];
    
    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(ticket => 
        ticket.fields.priority?.name === filters.priority
      );
    }
    
    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(ticket => 
        new Date(ticket.fields.created) >= cutoffDate
      );
    }
    
    setFilteredTickets(filtered);
  }, [tickets, filters]);

  // Detect dark mode from Jira theme
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Theme colors
  const theme = {
    background: isDarkMode ? '#1D2125' : '#F4F5F7',
    cardBackground: isDarkMode ? '#22272B' : 'white',
    textPrimary: isDarkMode ? '#B6C2CF' : '#172B4D',
    textSecondary: isDarkMode ? '#9FADBC' : '#5E6C84',
    border: isDarkMode ? '#38414A' : '#DFE1E6'
  };
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif', 
      backgroundColor: theme.background, 
      minHeight: '100vh',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Hero Banner */}
      <div style={{
        marginBottom: '30px',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        height: '200px',
        backgroundImage: 'url(triageninja-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {/* Dark overlay for better text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 0
        }} />
        
        <div style={{ zIndex: 1, flex: 1 }}>
          <h1 style={{ 
            margin: 0, 
            color: 'white', 
            fontSize: '36px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            TriageNinja
          </h1>
          <p style={{ 
            margin: '10px 0 0 0', 
            color: 'rgba(255,255,255,0.95)', 
            fontSize: '16px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}>
            AI-Powered Ticket Triage for Jira
          </p>
        </div>
        <div style={{ zIndex: 1 }}>
          <TestTicketButton t={t} onTicketsCreated={() => window.location.reload()} />
        </div>
      </div>

      {/* Statistics Cards - Task 4.1 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {loadingStats ? (
          <>
            <LoadingCard theme={theme} color="#FF5630" />
            <LoadingCard theme={theme} color="#36B37E" />
            <LoadingCard theme={theme} color="#0052CC" />
            <LoadingCard theme={theme} color="#6554C0" />
          </>
        ) : (
          <>
            <StatCard
              title={t.untriaged}
              value={statistics.untriagedCount}
              color="#FF5630"
              theme={theme}
            />
            <StatCard
              title={t.todayProcessed}
              value={statistics.todayProcessed}
              color="#36B37E"
              theme={theme}
            />
            <StatCard
              title={t.timeSaved}
              value={`${statistics.timeSaved}%`}
              color="#0052CC"
              theme={theme}
            />
            <StatCard
              title={t.aiAccuracy}
              value={`${statistics.aiAccuracy}%`}
              color="#6554C0"
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Filters - Task 4.3 */}
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '15px',
        marginBottom: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label 
            htmlFor="assignee-filter"
            style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 'bold' }}>
            {t.assignee || 'Assignee'}:
          </label>
          <select
            id="assignee-filter"
            value={filters.assignee}
            onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
            style={{
              padding: '6px 10px',
              borderRadius: '3px',
              border: `1px solid ${theme.border}`,
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: theme.cardBackground,
              color: theme.textPrimary
            }}
          >
            <option value="untriaged">{t.untriaged || 'Untriaged'}</option>
            <option value="all">{t.all}</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label 
            htmlFor="priority-filter"
            style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 'bold' }}>
            {t.priority}:
          </label>
          <select
            id="priority-filter"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            style={{
              padding: '6px 10px',
              borderRadius: '3px',
              border: `1px solid ${theme.border}`,
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: theme.cardBackground,
              color: theme.textPrimary
            }}
          >
            <option value="all">{t.all}</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Lowest">Lowest</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label 
            htmlFor="date-filter"
            style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 'bold' }}>
            {t.period}:
          </label>
          <select
            id="date-filter"
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            style={{
              padding: '6px 10px',
              borderRadius: '3px',
              border: `1px solid ${theme.border}`,
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: theme.cardBackground,
              color: theme.textPrimary
            }}
          >
            <option value="all">{t.all}</option>
            <option value="today">{t.today}</option>
            <option value="week">{t.week}</option>
            <option value="month">{t.month}</option>
          </select>
        </div>
        
        <div style={{ marginLeft: 'auto', fontSize: '14px', color: theme.textSecondary }}>
          {filteredTickets.length} {t.ticketsCount}
        </div>
      </div>

      {/* Tickets List - Task 4.2 */}
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '15px'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: theme.textPrimary }}>
            {t.tickets || 'Tickets'}
          </h2>
          <RefreshButton 
            onRefresh={async () => {
              setLoadingTickets(true);
              try {
                const ticketList = await invoke('getTickets', { filter: filters.assignee });
                setTickets(ticketList);
                setFilteredTickets(ticketList);
              } catch (err) {
                console.error('Failed to refresh tickets:', err);
              } finally {
                setLoadingTickets(false);
              }
            }}
            theme={theme}
          />
        </div>
        {loadingTickets ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: `4px solid ${theme.border}`,
              borderTop: '4px solid #0052CC',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: theme.textSecondary, marginTop: '15px' }}>
              {t.loadingTickets || 'Loading tickets...'}
            </p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
            {tickets.length === 0 
              ? t.allTriaged
              : t.noMatchingTickets}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Table Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 8px',
              borderBottom: `2px solid ${theme.border}`,
              gap: '10px',
              fontWeight: 'bold',
              fontSize: '12px',
              color: theme.textSecondary,
              backgroundColor: theme.background
            }}>
              <div style={{ flex: '0 0 auto', minWidth: '90px' }}>
                {t.key || 'Key'}
              </div>
              <div style={{ flex: '1 1 auto' }}>
                {t.summary || 'Summary'}
              </div>
              <div style={{ flex: '0 0 120px' }}>
                {t.assignee || 'Assignee'}
              </div>
              <div style={{ flex: '0 0 100px' }}>
                {t.status || 'Status'}
              </div>
              <div style={{ flex: '0 0 90px' }}>
                {t.created || 'Created'}
              </div>
              <div style={{ flex: '0 0 auto', minWidth: '70px', textAlign: 'center' }}>
                {t.priority}
              </div>
              <div style={{ flex: '0 0 auto', minWidth: '80px' }}>
                {/* Triage button column */}
              </div>
            </div>
            
            {/* Ticket Rows */}
            {filteredTickets.slice(0, 20).map((ticket) => (
              <TicketRow 
                key={ticket.key} 
                ticket={ticket} 
                t={t} 
                theme={theme}
                onTriageClick={() => setTriageModal({ isOpen: true, ticket, loading: false, result: null, error: null })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Triage Modal */}
      {triageModal.isOpen && (
        <TriageModal
          ticket={triageModal.ticket}
          onClose={() => setTriageModal({ isOpen: false, ticket: null, loading: false, result: null, error: null })}
          onSuccess={() => {
            setTriageModal({ isOpen: false, ticket: null, loading: false, result: null, error: null });
            // Refresh tickets
            const fetchTickets = async () => {
              try {
                const ticketList = await invoke('getTickets', { filter: filters.assignee });
                setTickets(ticketList);
                setFilteredTickets(ticketList);
              } catch (err) {
                console.error('Failed to refresh tickets:', err);
              }
            };
            fetchTickets();
          }}
          theme={theme}
          t={t}
        />
      )}

      {/* Version Footer */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '12px',
        color: theme.textSecondary
      }}>
        TriageNinja v5.28.0 (Production)
      </div>
    </div>
  );
}

/**
 * Triage Modal Component
 * Displays AI triage results and allows applying them
 */
function TriageModal({ ticket, onClose, onSuccess, theme, t }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);

  useEffect(() => {
    const runTriage = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Run AI triage
        const triageResult = await invoke('runAITriage', {
          issueKey: ticket.key,
          summary: ticket.fields.summary,
          description: ticket.fields.description || '',
          reporter: ticket.fields.reporter?.displayName || '',
          created: ticket.fields.created
        });
        
        setResult(triageResult);
      } catch (err) {
        console.error('Failed to run AI triage:', err);
        setError(err.message || 'Failed to run AI triage');
      } finally {
        setLoading(false);
      }
    };
    
    runTriage();
  }, [ticket]);

  const handleApply = async () => {
    if (!result) return;
    
    setLoading(true);
    try {
      await invoke('applyTriageResult', {
        issueKey: ticket.key,
        priority: result.priority,
        assigneeId: result.suggestedAssignee?.id,
        category: result.category,
        subCategory: result.subCategory
      });
      
      onSuccess();
    } catch (err) {
      console.error('Failed to apply triage:', err);
      setError(err.message || 'Failed to apply triage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: theme.textPrimary }}>
            {t.aiTriage || 'AI Triage'}: {ticket.key}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: theme.textSecondary
            }}
          >
            ×
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: `4px solid ${theme.border}`,
              borderTop: '4px solid #0052CC',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: theme.textSecondary, marginTop: '15px' }}>
              {t.analyzingTicket || 'Analyzing ticket...'}
            </p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#FFEBE6',
            border: '1px solid #FF5630',
            borderRadius: '3px',
            color: '#BF2600',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {result && !loading && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: theme.textPrimary }}>{t.category || 'Category'}:</strong>
              <span style={{ marginLeft: '8px', color: theme.textSecondary }}>
                {result.category} / {result.subCategory}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: theme.textPrimary }}>{t.priority}:</strong>
              <span style={{ 
                marginLeft: '8px',
                padding: '4px 8px',
                borderRadius: '3px',
                backgroundColor: PRIORITY_COLORS[result.priority] || '#5E6C84',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {result.priority}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: theme.textPrimary }}>{t.suggestedAssignee || 'Suggested Assignee'}:</strong>
              <div style={{ marginTop: '8px', padding: '12px', backgroundColor: theme.background, borderRadius: '3px' }}>
                <div style={{ color: theme.textPrimary, fontWeight: 'bold' }}>
                  {result.suggestedAssignee?.name || 'None'}
                </div>
                <div style={{ color: theme.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                  {result.suggestedAssignee?.reason}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: theme.textPrimary }}>{t.confidence || 'Confidence'}:</strong>
              <span style={{ marginLeft: '8px', color: theme.textSecondary }}>
                {result.confidence}%
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleApply}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#0052CC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {t.applyTriage || 'Apply Triage'}
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: theme.border,
                  color: theme.textPrimary,
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Refresh Button Component
 * Displays a shuriken icon that spins twice when clicked
 */
function RefreshButton({ onRefresh, theme }) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    if (spinning) return; // Prevent multiple clicks
    
    setSpinning(true);
    await onRefresh();
    
    // Keep spinning for 1 second (2 rotations at 0.5s each)
    setTimeout(() => {
      setSpinning(false);
    }, 1000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      style={{
        background: 'none',
        border: 'none',
        cursor: spinning ? 'not-allowed' : 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: spinning ? 0.6 : 1,
        transition: 'opacity 0.2s'
      }}
      aria-label="Refresh tickets"
      title="Refresh tickets"
    >
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: spinning ? 'spin-twice 1s linear' : 'none'
        }}
      >
        <path 
          d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" 
          fill="#0052CC" 
          stroke="#0052CC" 
          strokeWidth="1" 
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2" fill="white"/>
      </svg>
    </button>
  );
}

/**
 * Test Ticket Creation Button Component
 * Creates sample tickets for testing the triage functionality
 */
function TestTicketButton({ t, onTicketsCreated }) {
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateTestTickets = async () => {
    setCreating(true);
    setMessage('');
    
    try {
      const result = await invoke('createTestTickets');
      setMessage(`✅ ${result.count} ${t.testTicketsCreated}`);
      
      // Refresh the page after 2 seconds
      setTimeout(() => {
        if (onTicketsCreated) {
          onTicketsCreated();
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create test tickets:', error);
      setMessage(`❌ ${t.testTicketsFailed}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      <button
        onClick={handleCreateTestTickets}
        disabled={creating}
        style={{
          padding: '8px 16px',
          backgroundColor: creating ? '#B3D4FF' : '#0052CC',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: creating ? 'not-allowed' : 'pointer',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
      >
        {creating ? t.creating : t.createTestTickets}
      </button>
      {message && (
        <div style={{ 
          fontSize: '12px', 
          color: message.startsWith('✅') ? '#36B37E' : '#FF5630',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

/**
 * Loading Card Component
 * Displays a skeleton loader for statistics cards
 */
function LoadingCard({ theme, color }) {
  return (
    <div 
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '15px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        borderTop: `3px solid ${color}`,
        minWidth: '150px'
      }}>
      <div style={{ 
        height: '14px', 
        width: '60%', 
        backgroundColor: theme.border,
        borderRadius: '3px',
        marginBottom: '8px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{ 
        height: '32px', 
        width: '40%', 
        backgroundColor: theme.border,
        borderRadius: '3px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
    </div>
  );
}

/**
 * Statistics Card Component
 * Task 4.1: Real-time updating statistics cards
 * Task 4.4: Responsive design
 */
function StatCard({ title, value, color, theme }) {
  return (
    <div 
      className="stat-card"
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '15px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        borderTop: `3px solid ${color}`,
        minWidth: '150px',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}>
      <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '8px', fontWeight: '500' }}>
        {title}
      </div>
      <div style={{ 
        fontSize: 'clamp(24px, 5vw, 32px)', 
        fontWeight: 'bold', 
        color: theme.textPrimary
      }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Ticket Row Component
 * Task 4.2: Display ticket information with triage button
 * Task 4.4: Responsive design for mobile/tablet
 */
function TicketRow({ ticket, t, theme, onTriageClick }) {
  const handleViewClick = async () => {
    // Navigate to the issue using Forge router API
    try {
      await router.navigate(`/browse/${ticket.key}`);
    } catch (error) {
      console.error('Failed to navigate to issue:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} ${t.minutesAgo}`;
    if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`;
    if (diffDays < 7) return `${diffDays} ${t.daysAgo}`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className="ticket-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 8px',
        borderBottom: `1px solid ${theme.border}`,
        gap: '10px',
        transition: 'background-color 0.2s',
        overflow: 'hidden'
      }}>
      {/* Ticket Key - Clickable */}
      <div 
        onClick={handleViewClick}
        style={{ 
          flex: '0 0 auto',
          minWidth: '90px',
          fontWeight: 'bold', 
          color: '#0052CC',
          fontSize: '14px',
          cursor: 'pointer'
        }}>
        {ticket.key}
      </div>
      
      {/* Summary - Clickable */}
      <div 
        onClick={handleViewClick}
        style={{ 
          flex: '1 1 auto',
          color: theme.textPrimary,
          fontSize: '14px',
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
        {ticket.fields.summary}
      </div>
      
      {/* Assignee */}
      <div style={{
        flex: '0 0 120px',
        fontSize: '12px',
        color: theme.textSecondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {ticket.fields.assignee?.displayName || t.unassigned || 'Unassigned'}
      </div>
      
      {/* Status */}
      <div style={{
        flex: '0 0 100px',
        fontSize: '12px',
        color: theme.textSecondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {ticket.fields.status?.name || 'Unknown'}
      </div>
      
      {/* Created Date */}
      <div style={{
        flex: '0 0 90px',
        fontSize: '12px',
        color: theme.textSecondary,
        whiteSpace: 'nowrap'
      }}>
        {formatDate(ticket.fields.created)}
      </div>
      
      {/* Priority Badge */}
      <div style={{
        flex: '0 0 auto',
        minWidth: '70px',
        textAlign: 'center',
        padding: '4px 8px',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: PRIORITY_COLORS[ticket.fields.priority?.name] || '#5E6C84'
      }}>
        {ticket.fields.priority?.name || 'None'}
      </div>
      
      {/* Triage Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTriageClick();
        }}
        className="triage-button"
        aria-label={`${t.triageButton} ${ticket.key}`}
        style={{
          flex: '0 0 auto',
          padding: '6px 12px',
          backgroundColor: '#0052CC',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '12px',
          cursor: 'pointer',
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }}
      >
        {t.triageButton}
      </button>
    </div>
  );
}

export default App;
