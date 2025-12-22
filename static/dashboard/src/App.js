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
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [locale, setLocale] = useState('en');
  const [autoTriageEnabled, setAutoTriageEnabled] = useState(true);
  const [loadingAutoTriage, setLoadingAutoTriage] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created', direction: 'desc' });
  const [processedTimeRange, setProcessedTimeRange] = useState('today'); // 'today' or 'week'
  const [filters, setFilters] = useState({
    assignee: 'untriaged',
    status: 'open', // Default to 'open' tickets
    dateRange: 'all'
  });
  const [triageModal, setTriageModal] = useState({
    isOpen: false,
    ticket: null,
    loading: false,
    result: null,
    error: null
  });
  
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const t = getTranslations(locale);

  // Get user locale and auto-triage setting on mount
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
    
    const getAutoTriageSetting = async () => {
      try {
        const result = await invoke('getAutoTriageSetting');
        setAutoTriageEnabled(result.enabled);
      } catch (err) {
        console.error('Failed to get auto-triage setting:', err);
      }
    };
    
    getUserLocale();
    getAutoTriageSetting();
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

  // Fetch project members on mount
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const members = await invoke('getProjectMembers');
        setProjectMembers(members);
      } catch (err) {
        console.error('Failed to fetch project members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    
    fetchMembers();
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

  // Apply filters and sorting when tickets or filter settings change
  useEffect(() => {
    let filtered = [...tickets];
    
    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'open') {
        // Open tickets: not Done
        filtered = filtered.filter(ticket => 
          ticket.fields.status?.name !== 'Done'
        );
      } else if (filters.status === 'done') {
        // Done tickets
        filtered = filtered.filter(ticket => 
          ticket.fields.status?.name === 'Done'
        );
      } else if (filters.status === 'overdue') {
        // Overdue tickets: has duedate and past due
        filtered = filtered.filter(ticket => {
          const dueDate = ticket.fields.duedate;
          if (!dueDate) return false;
          return new Date(dueDate) < new Date();
        });
      }
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
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'key':
            aValue = a.key;
            bValue = b.key;
            break;
          case 'summary':
            aValue = a.fields.summary || '';
            bValue = b.fields.summary || '';
            break;
          case 'assignee':
            aValue = a.fields.assignee?.displayName || 'Unassigned';
            bValue = b.fields.assignee?.displayName || 'Unassigned';
            break;
          case 'status':
            aValue = a.fields.status?.name || '';
            bValue = b.fields.status?.name || '';
            break;
          case 'created':
            aValue = new Date(a.fields.created);
            bValue = new Date(b.fields.created);
            break;
          case 'priority':
            const priorityOrder = { 'Highest': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Lowest': 1, 'None': 0 };
            aValue = priorityOrder[a.fields.priority?.name] || 0;
            bValue = priorityOrder[b.fields.priority?.name] || 0;
            break;
          case 'duedate':
            aValue = a.fields.duedate ? new Date(a.fields.duedate) : new Date('9999-12-31');
            bValue = b.fields.duedate ? new Date(b.fields.duedate) : new Date('9999-12-31');
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    setFilteredTickets(filtered);
  }, [tickets, filters, sortConfig]);

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
  
  // Handle auto-triage toggle
  const handleAutoTriageToggle = async () => {
    setLoadingAutoTriage(true);
    try {
      const newValue = !autoTriageEnabled;
      await invoke('setAutoTriageSetting', { enabled: newValue });
      setAutoTriageEnabled(newValue);
    } catch (err) {
      console.error('Failed to update auto-triage setting:', err);
    } finally {
      setLoadingAutoTriage(false);
    }
  };
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif', 
      minHeight: '100vh',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: theme.background
    }}>
      {/* Hero Banner */}
      <div style={{
        marginBottom: '30px',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        height: '150px',
        backgroundImage: 'url(triageninja-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
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
        
        {/* Auto-Triage Toggle and AI Accuracy - Right side */}
        <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {/* Auto-Triage Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: loadingAutoTriage ? 'not-allowed' : 'pointer',
            opacity: loadingAutoTriage ? 0.6 : 1
          }}>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}>
              {t.autoTriage || 'Auto-Triage'}: {autoTriageEnabled ? (t.on || 'ON') : (t.off || 'OFF')}
            </span>
            <div
              onClick={loadingAutoTriage ? undefined : handleAutoTriageToggle}
              style={{
                width: '44px',
                height: '24px',
                backgroundColor: autoTriageEnabled ? '#36B37E' : 'rgba(255,255,255,0.3)',
                borderRadius: '12px',
                position: 'relative',
                transition: 'background-color 0.3s',
                cursor: loadingAutoTriage ? 'not-allowed' : 'pointer'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: autoTriageEnabled ? '22px' : '2px',
                transition: 'left 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
          </label>
          
          {/* AI Accuracy */}
          {!loadingStats && (
            <div style={{
              color: 'white',
              fontSize: '13px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span style={{ opacity: 0.9 }}>{t.aiAccuracy || 'AI Accuracy'}:</span>
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{statistics.aiAccuracy}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards - 4 cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {loadingStats ? (
          <>
            <LoadingCard theme={theme} color="#6554C0" />
            <LoadingCard theme={theme} color="#0052CC" />
            <LoadingCard theme={theme} color="#FF5630" />
            <LoadingCard theme={theme} color="#36B37E" />
          </>
        ) : (
          <>
            <StatCard
              title={t.untriaged}
              value={statistics.untriagedCount}
              color="#0052CC"
              theme={theme}
              onClick={() => setFilters({ assignee: 'untriaged', status: 'open', dateRange: 'all' })}
            />
            <StatCard
              title="Open Tickets"
              value={statistics.openTickets || 0}
              color="#6554C0"
              theme={theme}
              onClick={() => setFilters({ assignee: 'all', status: 'open', dateRange: 'all' })}
            />
            <StatCard
              title={t.overdueTickets || 'Overdue'}
              value={statistics.overdueCount}
              color="#FF5630"
              theme={theme}
              onClick={() => setFilters({ assignee: 'all', status: 'overdue', dateRange: 'all' })}
            />
            <ProcessedStatCard
              value={processedTimeRange === 'today' ? statistics.todayProcessed : statistics.weekProcessed}
              timeRange={processedTimeRange}
              onTimeRangeChange={(range) => {
                setProcessedTimeRange(range);
                setFilters({ assignee: 'all', status: 'done', dateRange: range });
              }}
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Tickets Section */}
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        border: `1px solid ${theme.border}`
      }}>
        {/* Header with Title and Refresh */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
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

        {/* Filters */}
        <div style={{
          padding: '15px 0',
          marginBottom: '20px',
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
              htmlFor="status-filter"
              style={{ fontSize: '14px', color: theme.textSecondary, fontWeight: 'bold' }}>
              {t.status || 'Status'}:
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
              <option value="open">Open</option>
              <option value="done">Done</option>
              <option value="overdue">Overdue</option>
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
          
          <div style={{ marginLeft: 'auto', fontSize: '14px', color: theme.textSecondary, fontWeight: 'bold' }}>
            {filteredTickets.length} {t.ticketsCount}
          </div>
        </div>

        {/* Tickets Table */}
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
          <div style={{ overflowX: 'auto', width: '100%' }}>
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
              minWidth: '1050px'
            }}>
              <div 
                onClick={() => handleSort('key')}
                style={{ flex: '0 0 auto', minWidth: '90px', cursor: 'pointer', userSelect: 'none' }}>
                {t.key || 'Key'} {sortConfig.key === 'key' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                onClick={() => handleSort('summary')}
                style={{ flex: '1 1 auto', cursor: 'pointer', userSelect: 'none' }}>
                {t.summary || 'Summary'} {sortConfig.key === 'summary' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div style={{ flex: '0 0 100px' }}>
                Action
              </div>
              <div 
                onClick={() => handleSort('assignee')}
                style={{ flex: '0 0 120px', cursor: 'pointer', userSelect: 'none' }}>
                {t.assignee || 'Assignee'} {sortConfig.key === 'assignee' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                onClick={() => handleSort('status')}
                style={{ flex: '0 0 100px', cursor: 'pointer', userSelect: 'none' }}>
                {t.status || 'Status'} {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                onClick={() => handleSort('created')}
                style={{ flex: '0 0 90px', cursor: 'pointer', userSelect: 'none' }}>
                {t.created || 'Created'} {sortConfig.key === 'created' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                onClick={() => handleSort('duedate')}
                style={{ flex: '0 0 90px', cursor: 'pointer', userSelect: 'none' }}>
                Due Date {sortConfig.key === 'duedate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div 
                onClick={() => handleSort('priority')}
                style={{ flex: '0 0 70px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                {t.priority} {sortConfig.key === 'priority' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
          onSuccess={async () => {
            setTriageModal({ isOpen: false, ticket: null, loading: false, result: null, error: null });
            // Refresh tickets, statistics, and members
            try {
              const [ticketList, stats, members] = await Promise.all([
                invoke('getTickets', { filter: filters.assignee }),
                invoke('getStatistics'),
                invoke('getProjectMembers')
              ]);
              setTickets(ticketList);
              setFilteredTickets(ticketList);
              setStatistics(stats);
              setProjectMembers(members);
            } catch (err) {
              console.error('Failed to refresh data:', err);
            }
          }}
          theme={theme}
          t={t}
        />
      )}

      {/* Project Members Section */}
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '20px',
        marginTop: '40px',
        marginBottom: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        border: `1px solid ${theme.border}`
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: theme.textPrimary }}>
          Project Members
        </h2>
        {loadingMembers ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: theme.textSecondary }}>
              Loading members...
            </div>
          </div>
        ) : projectMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: theme.textSecondary }}>
              No members found
            </div>
          </div>
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
              color: theme.textSecondary
            }}>
              <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                Name
              </div>
              <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
                Role
              </div>
              <div style={{ flex: '0 0 auto', minWidth: '100px', textAlign: 'right' }}>
                Open Tickets
              </div>
            </div>
            
            {/* Table Rows */}
            {projectMembers.map(member => (
              <div
                key={member.accountId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 8px',
                  borderBottom: `1px solid ${theme.border}`,
                  gap: '10px',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ flex: '1 1 auto', minWidth: '150px', color: theme.textPrimary, fontWeight: '500' }}>
                  {member.displayName}
                </div>
                <div style={{ flex: '0 0 auto', minWidth: '120px', color: theme.textSecondary, fontSize: '13px' }}>
                  {member.role || 'Member'}
                </div>
                <div style={{ flex: '0 0 auto', minWidth: '100px', textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: member.ticketCount > 5 ? '#FF5630' : member.ticketCount > 0 ? '#6554C0' : '#6B778C'
                  }}>
                    {member.ticketCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Developer Tools - Collapsible Section */}
      <details style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '15px',
        marginTop: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        border: `1px solid ${theme.border}`
      }}>
        <summary style={{
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          color: theme.textSecondary,
          userSelect: 'none',
          padding: '5px 0'
        }}>
          🛠️ Developer Tools
        </summary>
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.border}` }}>
          {/* Test Tickets Section */}
          <div>
            <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '8px' }}>
              Create sample tickets for testing:
            </div>
            <TestTicketButton t={t} onTicketsCreated={() => window.location.reload()} />
          </div>
        </div>
      </details>

      {/* Version Footer */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '12px',
        color: theme.textSecondary
      }}>
        TriageNinja v7.0.0 (Production) - Powered by Forge LLM (Rovo)
      </div>
    </div>
  );
}

/**
 * Triage Modal Component
 * Displays AI triage results and allows applying them
 * Automatically uses Forge LLM (Rovo) for AI-powered analysis
 */
function TriageModal({ ticket, onClose, onSuccess, theme, t }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);

  useEffect(() => {
    const runTriage = async () => {
      setLoading(true);
      setError(null);
      setWarning(null);
      
      try {
        // Run AI triage (backend automatically uses Rovo if available, otherwise keyword-based)
        const triageResult = await invoke('runAITriage', {
          issueKey: ticket.key,
          summary: ticket.fields.summary,
          description: ticket.fields.description || '',
          reporter: ticket.fields.reporter?.displayName || '',
          created: ticket.fields.created
        });
        
        setResult(triageResult);
        
        // Display which method was used
        if (triageResult.source === 'forge-llm-rovo') {
          console.log('✅ Triage completed using Forge LLM (Rovo)');
        } else if (triageResult.source === 'keyword-fallback') {
          console.log('⚠️ Triage completed using keyword-based fallback');
        }
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
    setError(null);
    setWarning(null);
    
    try {
      const response = await invoke('applyTriageResult', {
        issueKey: ticket.key,
        priority: result.priority,
        assigneeId: result.suggestedAssignee?.id,
        category: result.category,
        subCategory: result.subCategory
      });
      
      // Check if there's a warning (e.g., assignee couldn't be set)
      if (response.warning) {
        setWarning(response.warning);
        // Still call onSuccess after a short delay to show the warning
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        onSuccess();
      }
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
          <div>
            <h2 style={{ margin: 0, color: theme.textPrimary }}>
              {t.aiTriage || 'AI Triage'}: {ticket.key}
            </h2>
            {result && (
              <div style={{ 
                fontSize: '11px', 
                color: theme.textSecondary, 
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {result.source === 'forge-llm-rovo' ? (
                  <>
                    <span style={{ 
                      padding: '2px 6px', 
                      backgroundColor: '#E3FCEF', 
                      color: '#006644',
                      borderRadius: '3px',
                      fontWeight: '500'
                    }}>
                      🤖 Forge LLM (Rovo)
                    </span>
                    <span>AI-powered analysis</span>
                  </>
                ) : (
                  <>
                    <span style={{ 
                      padding: '2px 6px', 
                      backgroundColor: '#FFF4E5', 
                      color: '#974F0C',
                      borderRadius: '3px',
                      fontWeight: '500'
                    }}>
                      📋 Keyword-based
                    </span>
                    <span>Fallback mode</span>
                  </>
                )}
              </div>
            )}
          </div>
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

        {warning && (
          <div style={{
            padding: '12px',
            backgroundColor: '#FFF4E5',
            border: '1px solid #FF991F',
            borderRadius: '3px',
            color: '#974F0C',
            marginBottom: '16px'
          }}>
            ⚠️ {warning}
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
      const successMessage = `✅ ${result.count} test tickets created`;
      setMessage(successMessage);
      
      // Refresh the page after 2 seconds to show the message
      setTimeout(() => {
        if (onTicketsCreated) {
          onTicketsCreated();
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create test tickets:', error);
      setMessage('❌ Failed to create test tickets');
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
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
        {creating ? '⏳ Creating...' : '🧪 Create Test Tickets'}
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
 * Clickable cards that filter tickets
 */
function StatCard({ title, value, color, theme, onClick }) {
  return (
    <div 
      className="stat-card"
      onClick={onClick}
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '12px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        borderTop: `3px solid ${color}`,
        minWidth: '150px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(9,30,66,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 1px rgba(9,30,66,0.25)';
      }}
    >
      <div style={{ fontSize: '11px', color: theme.textSecondary, marginBottom: '6px', fontWeight: '500' }}>
        {title}
      </div>
      <div style={{ 
        fontSize: 'clamp(22px, 5vw, 28px)', 
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

  const isAssigned = !!ticket.fields.assignee?.displayName;

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
        overflow: 'hidden',
        minWidth: '1050px'
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
      
      {/* Action Buttons */}
      <div style={{ flex: '0 0 100px', display: 'flex', gap: '6px' }}>
        {/* Triage Button - Blue if unassigned, outline if assigned */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTriageClick();
          }}
          className="triage-button"
          aria-label={`${t.triageButton} ${ticket.key}`}
          style={{
            padding: '6px 12px',
            backgroundColor: isAssigned ? 'transparent' : '#0052CC',
            color: isAssigned ? '#0052CC' : 'white',
            border: isAssigned ? '1px solid #0052CC' : 'none',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s',
            width: '100%'
          }}
        >
          {t.triageButton}
        </button>
      </div>
      
      {/* Assignee - Display name or dash */}
      <div style={{
        flex: '0 0 120px',
        fontSize: '12px',
        color: theme.textSecondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {ticket.fields.assignee?.displayName || '-'}
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
      
      {/* Due Date - Red label if overdue */}
      <div style={{
        flex: '0 0 90px',
        fontSize: '12px',
        whiteSpace: 'nowrap'
      }}>
        {ticket.fields.duedate ? (
          (() => {
            const dueDate = new Date(ticket.fields.duedate);
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Reset time to compare dates only
            const isOverdue = dueDate < now;
            const formattedDate = dueDate.toLocaleDateString();
            
            return isOverdue ? (
              <span style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '3px',
                backgroundColor: '#FF5630',
                color: 'white',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(255,86,48,0.3)'
              }}>
                ⚠️ {formattedDate}
              </span>
            ) : (
              <span style={{ color: theme.textSecondary }}>
                {formattedDate}
              </span>
            );
          })()
        ) : (
          <span style={{ color: theme.textSecondary }}>-</span>
        )}
      </div>
      
      {/* Priority - Text display */}
      <div style={{
        flex: '0 0 70px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: '500',
        color: PRIORITY_COLORS[ticket.fields.priority?.name] || theme.textSecondary
      }}>
        {ticket.fields.priority?.name || 'None'}
      </div>
    </div>
  );
}

/**
 * Processed Stat Card Component with Time Range Selector
 * Allows switching between Today and Week views
 */
function ProcessedStatCard({ value, timeRange, onTimeRangeChange, theme }) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div 
      style={{
        position: 'relative',
        backgroundColor: theme.cardBackground,
        borderRadius: '3px',
        padding: '12px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
        borderTop: '3px solid #36B37E',
        minWidth: '150px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onClick={() => setShowDropdown(!showDropdown)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(9,30,66,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 1px rgba(9,30,66,0.25)';
      }}
    >
      <div style={{ fontSize: '11px', color: theme.textSecondary, marginBottom: '6px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Processed</span>
        <span style={{ fontSize: '9px' }}>▼</span>
      </div>
      <div style={{ 
        fontSize: 'clamp(22px, 5vw, 28px)', 
        fontWeight: 'bold', 
        color: theme.textPrimary
      }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: theme.textSecondary, marginTop: '2px' }}>
        {timeRange === 'today' ? 'today' : 'this week'}
      </div>
      
      {/* Dropdown Menu */}
      {showDropdown && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.border}`,
            borderRadius: '3px',
            boxShadow: '0 4px 8px rgba(9,30,66,0.25)',
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => {
              onTimeRangeChange('today');
              setShowDropdown(false);
            }}
            style={{
              padding: '10px 15px',
              cursor: 'pointer',
              backgroundColor: timeRange === 'today' ? theme.background : 'transparent',
              color: theme.textPrimary,
              fontSize: '14px',
              borderBottom: `1px solid ${theme.border}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = timeRange === 'today' ? theme.background : 'transparent'}
          >
            ✓ Today
          </div>
          <div
            onClick={() => {
              onTimeRangeChange('week');
              setShowDropdown(false);
            }}
            style={{
              padding: '10px 15px',
              cursor: 'pointer',
              backgroundColor: timeRange === 'week' ? theme.background : 'transparent',
              color: theme.textPrimary,
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = timeRange === 'week' ? theme.background : 'transparent'}
          >
            ✓ This Week
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
