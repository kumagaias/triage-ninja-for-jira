/**
 * Internationalization (i18n) support
 * Translations for English and Japanese
 */

export const translations = {
  en: {
    // Header
    dashboardTitle: 'TriageNinja Dashboard',
    createTestTickets: 'Create Test Tickets',
    creating: 'Creating...',
    testTicketsCreated: 'test tickets created',
    testTicketsFailed: 'Failed to create test tickets',
    
    // Statistics Cards
    untriaged: 'Untriaged',
    todayProcessed: 'Today Processed',
    timeSaved: 'Time Saved',
    aiAccuracy: 'AI Accuracy',
    
    // Filters
    priority: 'Priority',
    period: 'Period',
    all: 'All',
    today: 'Today',
    week: 'Past 7 days',
    month: 'Past 30 days',
    ticketsCount: 'tickets',
    
    // Untriaged Tickets
    untriagedTickets: 'Untriaged Tickets',
    allTriaged: 'All tickets have been triaged 🎉',
    noMatchingTickets: 'No tickets match the filter criteria',
    triageButton: 'Triage',
    
    // Time formatting
    minutesAgo: 'min ago',
    hoursAgo: 'hr ago',
    daysAgo: 'd ago',
    
    // Loading
    loading: 'Loading dashboard...'
  },
  ja: {
    // Header
    dashboardTitle: 'TriageNinja ダッシュボード',
    createTestTickets: 'テストチケット作成',
    creating: '作成中...',
    testTicketsCreated: '件のテストチケットを作成しました',
    testTicketsFailed: 'テストチケットの作成に失敗しました',
    
    // Statistics Cards
    untriaged: '未処理',
    todayProcessed: '本日の処理',
    timeSaved: '時間削減',
    aiAccuracy: 'AI精度',
    
    // Filters
    priority: '優先度',
    period: '期間',
    all: 'すべて',
    today: '今日',
    week: '過去7日間',
    month: '過去30日間',
    ticketsCount: '件のチケット',
    
    // Untriaged Tickets
    untriagedTickets: '未トリアージチケット',
    allTriaged: 'すべてのチケットがトリアージ済みです 🎉',
    noMatchingTickets: 'フィルター条件に一致するチケットがありません',
    triageButton: 'Triage',
    
    // Time formatting
    minutesAgo: '分前',
    hoursAgo: '時間前',
    daysAgo: '日前',
    
    // Loading
    loading: 'ダッシュボードを読み込み中...'
  }
};

/**
 * Get translation function for a specific locale
 * @param {string} locale - Locale code (e.g., 'en', 'ja')
 * @returns {function} Translation function
 */
export function getTranslations(locale) {
  // Default to English if locale not supported
  const lang = locale?.startsWith('ja') ? 'ja' : 'en';
  return translations[lang];
}
