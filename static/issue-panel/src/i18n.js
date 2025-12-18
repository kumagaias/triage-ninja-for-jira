/**
 * Internationalization (i18n) support for Issue Panel
 * Translations for English and Japanese
 */

export const translations = {
  en: {
    // Header
    aiTriage: 'AI Triage',
    
    // Status
    status: 'Status',
    notTriaged: 'Not Triaged',
    
    // Buttons
    runAITriage: '🥷 Run AI Triage',
    analyzing: 'Analyzing...',
    analyzingProgress: 'Analyzing',
    approveAndApply: 'Approve & Apply',
    applying: 'Applying...',
    reject: 'Reject',
    dismiss: 'Dismiss',
    cancel: 'Cancel',
    confirm: 'Confirm',
    
    // Loading
    loadingIssueDetails: 'Loading issue details...',
    
    // Errors
    failedToLoadIssue: 'Failed to load issue details. Please refresh the page.',
    issueDetailsNotLoaded: 'Issue details not loaded. Please refresh the page.',
    analysisFailed: 'Failed to analyze ticket. Please try again.',
    analysisTimeout: 'Analysis timed out after 30 seconds. Please try again.',
    applyFailed: 'Failed to apply triage result. Please try again.',
    
    // Success
    triageAppliedSuccess: 'Triage result applied successfully!',
    issueUpdatedWith: 'The issue has been updated with:',
    refreshNote: '🔄 Refresh the page to see changes in the main issue view',
    
    // Triage Result Sections
    confidenceScore: 'Confidence Score',
    category: 'Category',
    priorityAndUrgency: 'Priority & Urgency',
    priority: 'Priority',
    urgency: 'Urgency',
    suggestedAssignee: 'Suggested Assignee',
    similarTickets: 'Similar Tickets',
    reasoning: 'Reasoning',
    
    // Assignee Details
    avgResolution: 'Avg resolution',
    similar: 'similar',
    
    // Labels
    labels: 'Labels',
    assignee: 'Assignee',
    
    // Confirmation Dialog
    confirmTriageApplication: 'Confirm Triage Application',
    confirmApplyChanges: 'Are you sure you want to apply the following changes to this issue?'
  },
  ja: {
    // Header
    aiTriage: 'AI トリアージ',
    
    // Status
    status: 'ステータス',
    notTriaged: '未トリアージ',
    
    // Buttons
    runAITriage: '🥷 AI トリアージ実行',
    analyzing: '分析中...',
    analyzingProgress: '分析中',
    approveAndApply: '承認して適用',
    applying: '適用中...',
    reject: '却下',
    dismiss: '閉じる',
    cancel: 'キャンセル',
    confirm: '確認',
    
    // Loading
    loadingIssueDetails: 'チケット情報を読み込み中...',
    
    // Errors
    failedToLoadIssue: 'チケット情報の読み込みに失敗しました。ページを更新してください。',
    issueDetailsNotLoaded: 'チケット情報が読み込まれていません。ページを更新してください。',
    analysisFailed: 'チケットの分析に失敗しました。もう一度お試しください。',
    analysisTimeout: '分析が30秒でタイムアウトしました。もう一度お試しください。',
    applyFailed: 'トリアージ結果の適用に失敗しました。もう一度お試しください。',
    
    // Success
    triageAppliedSuccess: 'トリアージ結果を適用しました！',
    issueUpdatedWith: 'チケットが以下の内容で更新されました:',
    refreshNote: '🔄 メインのチケット画面で変更を確認するにはページを更新してください',
    
    // Triage Result Sections
    confidenceScore: '信頼度スコア',
    category: 'カテゴリー',
    priorityAndUrgency: '優先度と緊急度',
    priority: '優先度',
    urgency: '緊急度',
    suggestedAssignee: '推奨担当者',
    similarTickets: '類似チケット',
    reasoning: '理由',
    
    // Assignee Details
    avgResolution: '平均解決時間',
    similar: '類似',
    
    // Labels
    labels: 'ラベル',
    assignee: '担当者',
    
    // Confirmation Dialog
    confirmTriageApplication: 'トリアージ適用の確認',
    confirmApplyChanges: '以下の変更をこのチケットに適用してもよろしいですか？'
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
