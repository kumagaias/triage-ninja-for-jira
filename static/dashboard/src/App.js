import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

/**
 * TriageNinja Dashboard Component
 * Displays triage statistics and untriaged tickets
 */
function App() {
  const [statistics, setStatistics] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, ticketList] = await Promise.all([
          invoke('getStatistics'),
          invoke('getUntriagedTickets')
        ]);
        setStatistics(stats);
        setTickets(ticketList);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', backgroundColor: '#F4F5F7', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#172B4D', fontSize: '24px' }}>
          TriageNinja Dashboard
        </h1>
        <span style={{ marginLeft: '10px', fontSize: '32px' }}>🥷</span>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
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

      {/* Untriaged Tickets */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '3px',
        padding: '20px',
        boxShadow: '0 1px 1px rgba(9,30,66,0.25)'
      }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: '#172B4D' }}>
          未トリアージチケット
        </h2>
        {tickets.length === 0 ? (
          <p style={{ color: '#5E6C84' }}>すべてのチケットがトリアージ済みです 🎉</p>
        ) : (
          <div>
            {tickets.slice(0, 10).map((ticket) => (
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
 */
function StatCard({ title, value, color }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '3px',
      padding: '20px',
      boxShadow: '0 1px 1px rgba(9,30,66,0.25)',
      borderTop: `3px solid ${color}`
    }}>
      <div style={{ fontSize: '12px', color: '#5E6C84', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#172B4D' }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Ticket Row Component
 */
function TicketRow({ ticket }) {
  const priorityColor = {
    Highest: '#FF5630',
    High: '#FF8B00',
    Medium: '#FFAB00',
    Low: '#36B37E',
    Lowest: '#00B8D9'
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #DFE1E6'
    }}>
      <div style={{ flex: '0 0 100px', fontWeight: 'bold', color: '#0052CC' }}>
        {ticket.key}
      </div>
      <div style={{ flex: 1, color: '#172B4D' }}>
        {ticket.fields.summary}
      </div>
      <div style={{
        flex: '0 0 80px',
        textAlign: 'center',
        padding: '4px 8px',
        borderRadius: '3px',
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: priorityColor[ticket.fields.priority?.name] || '#5E6C84'
      }}>
        {ticket.fields.priority?.name || 'None'}
      </div>
      <button style={{
        marginLeft: '10px',
        padding: '6px 12px',
        backgroundColor: '#0052CC',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        fontSize: '12px',
        cursor: 'pointer'
      }}>
        Triage
      </button>
    </div>
  );
}

export default App;
