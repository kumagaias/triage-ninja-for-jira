# クイックセットアップ: Rovo Agent（5分で完了）

## 📋 チェックリスト

- [ ] Jira管理者権限がある
- [ ] TriageNinjaアプリがインストール済み
- [ ] Rovo Agentが利用可能（確認方法は下記）

---

## ステップ1: Rovo Agent利用可能か確認（1分）

### 手順

1. **Jiraプロジェクトを開く**
   - https://kumagaias.atlassian.net
   - 左サイドバーからプロジェクト（例: SUP）を選択

2. **Project settings → Automation**
   - 左下の ⚙️ アイコン → **Project settings**
   - 左メニュー → **Automation**

3. **Create rule をクリック**

4. **トリガーを適当に選択**（例: Issue created）

5. **New action をクリック**

6. **検索ボックスに「Rovo」と入力**

### 結果

✅ **「Invoke Rovo Agent」が表示される**
→ ステップ2に進む

❌ **表示されない**
→ Rovo Agentが利用できません
→ 組織管理者にAtlassian Rovoの有効化を依頼してください
→ または、Jira Premiumプランへのアップグレードが必要です

---

## ステップ2: 自動トリアージルール作成（2分）

### 手順

1. **Create rule** → **Issue created** → Save

2. **New condition** → **Issue fields condition**
   - Field: **Issue type**
   - Condition: **is one of**
   - Value: **Task, Bug, Support Request**
   - Save

3. **New condition** → **Issue fields condition**
   - Field: **Assignee**
   - Condition: **is empty**
   - Save

4. **New action** → **Invoke Rovo Agent**
   - Agent: **TriageNinja AI Agent** を選択
   - Prompt: 以下をコピペ

```
Analyze this ticket: {{issue.key}}

Summary: {{issue.summary}}
Description: {{issue.description}}

Use these actions:
1. analyze-ticket-classification with issueKey={{issue.key}}
2. suggest-ticket-assignee with issueKey={{issue.key}}
3. find-similar-tickets with issueKey={{issue.key}}

Return JSON:
{
  "category": "string",
  "priority": "High|Medium|Low",
  "assigneeId": "string",
  "confidence": 85
}
```

   - Save

5. **New action** → **Edit issue**
   - Priority: `{{rovo.response.priority}}`
   - Assignee: `{{rovo.response.assigneeId}}`
   - Labels: 追加 → `ai-triaged`
   - Save

6. **ルール名**: `TriageNinja - Auto-Triage`

7. **Turn on rule**

---

## ステップ3: 手動トリアージルール作成（2分）

### 手順

1. **Create rule** → **Issue updated** → Save

2. **New condition** → **Field value changed**
   - Field: **Labels**
   - Change type: **Added**
   - Value: `run-ai-triage`
   - Save

3. **New action** → **Invoke Rovo Agent**
   - Agent: **TriageNinja AI Agent**
   - Prompt: ステップ2と同じプロンプトをコピペ
   - Save

4. **New action** → **Edit issue**
   - Priority: `{{rovo.response.priority}}`
   - Assignee: `{{rovo.response.assigneeId}}`
   - Labels: 追加 → `ai-triaged`
   - Save

5. **New action** → **Edit issue**
   - Labels: 削除 → `run-ai-triage`
   - Save

6. **ルール名**: `TriageNinja - Manual Triage`

7. **Turn on rule**

---

## ステップ4: テスト（1分）

### 自動トリアージのテスト

1. **新しいチケットを作成**
   - Summary: `Test VPN connection issue`
   - Issue Type: Task
   - Assignee: （空欄）

2. **10秒待つ**

3. **チケットを確認**
   - ✅ Priority が設定されている
   - ✅ Assignee が割り当てられている
   - ✅ Label `ai-triaged` が追加されている

### 手動トリアージのテスト

1. **既存のチケットを開く**

2. **右サイドバー → AI Triage パネル**

3. **Run AI Triage ボタンをクリック**

4. **結果が表示される**（30秒以内）

5. **Apply Triage をクリック**

6. **チケットが更新される**

---

## トラブルシューティング

### ❌ TriageNinja AI Agent が選択肢に表示されない

**解決策:**
```bash
# 再デプロイ
forge deploy --environment production
forge install --upgrade --environment production
```

### ❌ ルールが実行されない

**確認:**
1. Project settings → Automation → Audit log
2. ルールが **Enabled** になっているか確認
3. 条件（Issue type, Assignee）が一致しているか確認

### ❌ エラーが発生する

**ログ確認:**
```bash
forge logs --environment production --tail
```

---

## 完了！

✅ Rovo Agentが有効化されました  
✅ 自動トリアージが動作します  
✅ 手動トリアージが動作します

**次のステップ:**
- 実際のチケットで試してみる
- Audit logで実行履歴を確認
- 精度を監視して改善

---

## 詳細ガイド

より詳しい手順は以下を参照:
- [Jira Automation Setup Guide](./jira-automation-setup-guide.md)
- [Automation Rules Documentation](./automation-rules.md)
- [Rovo Integration Guide](./rovo-integration.md)

