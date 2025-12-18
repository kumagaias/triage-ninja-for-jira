import React, { useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import { getTranslations } from './i18n';

// Priority color mapping - moved outside component to avoid recreation on each render
const PRIORITY_COLORS = {
  Highest: '#FF5630',
  High: '#FF8B00',
  Medium: '#FFAB00',
  Low: '#36B37E',
  Lowest: '#00B8D9'
};

// Add CSS for hover effects
const styles = `
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(9,30,66,0.25) !important;
  }
  
  .ticket-row:hover {
    background-color: #F4F5F7 !important;
  }
  
  .triage-button:hover {
    background-color: #0747A6 !important;
  }
  
  .run-triage-button:hover {
    background-color: #0747A6 !important;
  }
  
  .approve-button:hover {
    background-color: #0747A6 !important;
  }
  
  .reject-button:hover {
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
 * TriageNinja Dashboard Component
 * Displays triage statistics and untriaged tickets
 */
function App() {
  const [statistics, setStatistics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState('en');
  const [filters, setFilters] = useState({
    priority: 'all',
    dateRange: 'all'
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

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, ticketList] = await Promise.all([
          invoke('getStatistics'),
          invoke('getUntriagedTickets')
        ]);
        setStatistics(stats);
        setTickets(ticketList);
        setFilteredTickets(ticketList);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const intervalId = setInterval(fetchData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>{t.loading}</div>
      </div>
    );
  }

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

      {/* Untriaged Tickets - Task 4.2 */}
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: theme.textPrimary, marginBottom: '15px' }}>
          {t.untriagedTickets}
        </h2>
        {filteredTickets.length === 0 ? (
          <p style={{ color: theme.textSecondary, textAlign: 'center', padding: '20px' }}>
            {tickets.length === 0 
              ? t.allTriaged
              : t.noMatchingTickets}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {filteredTickets.slice(0, 20).map((ticket) => (
              <TicketRow key={ticket.key} ticket={ticket} t={t} theme={theme} />
            ))}
          </div>
        )}
      </div>

      {/* Version Footer */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '12px',
        color: theme.textSecondary
      }}>
        TriageNinja v5.4.0 (Production)
      </div>
    </div>
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
function TicketRow({ ticket, t, theme }) {
  const handleTriageClick = () => {
    // Open the issue in a new tab
    // Note: In Forge apps, we can use the issue key to construct the URL
    // The actual Jira URL will be available in the context
    window.open(`/browse/${ticket.key}`, '_blank', 'noopener,noreferrer');
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
        flexWrap: 'wrap',
        transition: 'background-color 0.2s'
      }}>
      {/* Ticket Key */}
      <div style={{ 
        flex: '0 0 auto',
        minWidth: '90px',
        fontWeight: 'bold', 
        color: '#0052CC',
        fontSize: '14px'
      }}>
        {ticket.key}
      </div>
      
      {/* Summary */}
      <div style={{ 
        flex: '1 1 300px',
        color: theme.textPrimary,
        fontSize: '14px',
        minWidth: '200px'
      }}>
        {ticket.fields.summary}
      </div>
      
      {/* Created Date */}
      <div style={{
        flex: '0 0 auto',
        fontSize: '12px',
        color: theme.textSecondary,
        minWidth: '80px'
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
        onClick={handleTriageClick}
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
