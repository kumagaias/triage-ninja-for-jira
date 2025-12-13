import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

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
  const [filters, setFilters] = useState({
    priority: 'all',
    dateRange: 'all'
  });

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
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif', 
      backgroundColor: '#F4F5F7', 
      minHeight: '100vh',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 style={{ margin: 0, color: '#172B4D', fontSize: '24px' }}>
          TriageNinja Dashboard
        </h1>
        <span style={{ fontSize: '32px' }}>🥷</span>
      </div>

      {/* Statistics Cards - Task 4.1 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <StatCard
          title="未処理"
          value={statistics.untriagedCount}
          color="#FF5630"
        />
        <StatCard
          title="本日の処理"
          value={statistics.todayProcessed}
          color="#36B37E"
        />
        <StatCard
          title="時間削減"
          value={`${statistics.timeSaved}%`}
          color="#0052CC"
        />
        <StatCard
          title="AI精度"
          value={`${statistics.aiAccuracy}%`}
          color="#6554C0"
        />
      </div>

      {/* Filters - Task 4.3 */}
      <div style={{
        backgroundColor: 'white',
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
            style={{ fontSize: '14px', color: '#5E6C84', fontWeight: 'bold' }}>
            優先度:
          </label>
          <select
            id="priority-filter"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            style={{
              padding: '6px 10px',
              borderRadius: '3px',
              border: '1px solid #DFE1E6',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="all">すべて</option>
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
            style={{ fontSize: '14px', color: '#5E6C84', fontWeight: 'bold' }}>
            期間:
          </label>
          <select
            id="date-filter"
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            style={{
              padding: '6px 10px',
              borderRadius: '3px',
              border: '1px solid #DFE1E6',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="all">すべて</option>
            <option value="today">今日</option>
            <option value="week">過去7日間</option>
            <option value="month">過去30日間</option>
          </select>
        </div>
        
        <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#5E6C84' }}>
          {filteredTickets.length} 件のチケット
        </div>
      </div>

      {/* Untriaged Tickets - Task 4.2 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '3px',
        padding: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: '#172B4D', marginBottom: '15px' }}>
          未トリアージチケット
        </h2>
        {filteredTickets.length === 0 ? (
          <p style={{ color: '#5E6C84', textAlign: 'center', padding: '20px' }}>
            {tickets.length === 0 
              ? 'すべてのチケットがトリアージ済みです 🎉' 
              : 'フィルター条件に一致するチケットがありません'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {filteredTickets.slice(0, 20).map((ticket) => (
              <TicketRow key={ticket.key} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Statistics Card Component
 * Task 4.1: Real-time updating statistics cards
 * Task 4.4: Responsive design
 */
function StatCard({ title, value, color }) {
  return (
    <div 
      className="stat-card"
      style={{
        backgroundColor: 'white',
        borderRadius: '3px',
        padding: '15px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        borderTop: `3px solid ${color}`,
        minWidth: '150px',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}>
      <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: '8px', fontWeight: '500' }}>
        {title}
      </div>
      <div style={{ 
        fontSize: 'clamp(24px, 5vw, 32px)', 
        fontWeight: 'bold', 
        color: '#172B4D' 
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
function TicketRow({ ticket }) {
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
    
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <div 
      className="ticket-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 8px',
        borderBottom: '1px solid #DFE1E6',
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
        color: '#172B4D',
        fontSize: '14px',
        minWidth: '200px'
      }}>
        {ticket.fields.summary}
      </div>
      
      {/* Created Date */}
      <div style={{
        flex: '0 0 auto',
        fontSize: '12px',
        color: '#5E6C84',
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
        aria-label={`Triage ticket ${ticket.key}`}
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
        Triage
      </button>
    </div>
  );
}

export default App;
