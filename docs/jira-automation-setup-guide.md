# Jira Automation Setup Guide - TriageNinja

## 前提条件の確認

### 1. Rovo Agentが利用可能か確認

Jira Automationルールを作成する前に、Rovo Agentが利用可能か確認します。

#### 確認手順

1. **Jiraサイトにアクセス**
   - https://kumagaias.atlassian.net にアクセス

2. **プロジェクト設定を開く**
   - 左サイドバーから対象プロジェクト（例: SUP）を選択
   - 左下の **⚙️ Project settings** をクリック

3. **Automationページを開く**
   - 左メニューから **Automation** をクリック
   - または、URL: `https://kumagaias.atlassian.net/jira/settings/projects/SUP/automation`

4. **新しいルールを作成**
   - 右上の **Create rule** ボタンをクリック

5. **Rovo Agentアクションを確認**
   - トリガーを適当に選択（例: Issue created）
   - **New action** または **Add action** をクリック
   - 検索ボックスに「**Rovo**」または「**Agent**」と入力
   - **「Invoke Rovo Agent」** というアクションが表示されるか確認

#### ケース1: Rovo Agentが表示される場合 ✅

→ **このガイドの「自動トリアージルールの作成」に進んでください**

#### ケース2: Rovo Agentが表示されない場合 ❌

Rovo Agentが利用できない理由:

1. **Atlassian Rovo が組織で有効化されていない**
   - Atlassian Rovo は Premium 機能です
   - 組織の管理者に有効化を依頼してください

2. **Jiraプランが対応していない**
   - Rovo Agent は Jira Premium 以上で利用可能
   - プランをアップグレードする必要があります

3. **機能がまだロールアウトされていない**
   - Rovo Agent は段階的にロールアウト中
   - Atlassian サポートに問い合わせてください

**代替案:**
- Rovo Agentなしでも、TriageNinjaは動作します
- キーワードベースの分類（フォールバック）を使用
- 精度は下がりますが、基本的なトリアージは可能

---

## 自動トリアージルールの作成

### Rule 1: 自動トリアージ（チケット作成時）

新しいチケットが作成されたときに自動的にトリアージを実行します。

#### Step 1: ルールの作成開始

1. **Automation ページを開く**
   - Project settings → Automation
   - 右上の **Create rule** をクリック

2. **トリガーを選択**
   - **Issue created** を選択
   - **Save** をクリック

#### Step 2: 条件の追加

1. **条件1: Issue typeを制限**
   - **New condition** をクリック
   - **Issue fields condition** を選択
   - 設定:
     - Field: **Issue type**
     - Condition: **is one of**
     - Value: **Task**, **Bug**, **Support Request** を選択
   - **Save** をクリック

2. **条件2: Assigneeが空**
   - **New condition** をクリック
   - **Issue fields condition** を選択
   - 設定:
     - Field: **Assignee**
     - Condition: **is empty**
   - **Save** をクリック

#### Step 3: Rovo Agentアクションの追加

1. **アクションを追加**
   - **New action** をクリック
   - 検索: **Invoke Rovo Agent**
   - **Invoke Rovo Agent** を選択

2. **Rovo Agentを選択**
   - Agent: **TriageNinja AI Agent** を選択
   - （リストに表示されない場合は、TriageNinjaアプリが正しくデプロイされているか確認）

3. **プロンプトを入力**

```
Analyze this Jira ticket and provide triage recommendations.

Ticket Information:
- Issue Key: {{issue.key}}
- Summary: {{issue.summary}}
- Description: {{issue.description}}
- Reporter: {{issue.reporter.displayName}}
- Created: {{issue.created}}

Please use the following actions to gather information:
1. analyze-ticket-classification with issueKey={{issue.key}}
2. suggest-ticket-assignee with issueKey={{issue.key}} and category from step 1
3. find-similar-tickets with issueKey={{issue.key}}

Based on the analysis, provide your recommendations in JSON format:
{
  "category": "string",
  "subCategory": "string", 
  "priority": "High|Medium|Low",
  "urgency": "Urgent|Normal",
  "assignee": "string",
  "assigneeId": "string",
  "confidence": 85,
  "reasoning": "string"
}
```

4. **Save** をクリック

#### Step 4: チケット更新アクションの追加

1. **アクションを追加**
   - **New action** をクリック
   - **Edit issue** を選択

2. **フィールドを設定**
   - Priority: `{{rovo.response.priority}}`
   - Assignee: `{{rovo.response.assigneeId}}`
   - Labels: 追加
     - `ai-triaged`
     - `ai-category:{{rovo.response.category}}`
     - `ai-confidence:{{rovo.response.confidence}}`

3. **Save** をクリック

#### Step 5: ルールを保存して有効化

1. **ルール名を入力**
   - Name: **TriageNinja - Auto-Triage New Tickets**

2. **Turn on rule** をクリック

3. **確認**
   - ルールが **Enabled** 状態になっていることを確認

---

## 手動トリアージルールの作成

### Rule 2: 手動トリアージ（ラベル追加時）

ユーザーが「Run AI Triage」ボタンをクリックしたときに実行されます。

#### Step 1: ルールの作成開始

1. **Create rule** をクリック

2. **トリガーを選択**
   - **Issue updated** を選択
   - **Save** をクリック

#### Step 2: 条件の追加

1. **条件: ラベルが追加された**
   - **New condition** をクリック
   - **Field value changed** を選択
   - 設定:
     - Field: **Labels**
     - Change type: **Added**
     - Value: **run-ai-triage**
   - **Save** をクリック

#### Step 3: Rovo Agentアクションの追加

1. **アクションを追加**
   - **New action** をクリック
   - **Invoke Rovo Agent** を選択

2. **Rovo Agentを選択**
   - Agent: **TriageNinja AI Agent**

3. **プロンプトを入力**

```
Analyze this Jira ticket and provide triage recommendations.

Ticket Information:
- Issue Key: {{issue.key}}
- Summary: {{issue.summary}}
- Description: {{issue.description}}
- Reporter: {{issue.reporter.displayName}}
- Current Assignee: {{issue.assignee.displayName}}
- Current Priority: {{issue.priority.name}}
- Created: {{issue.created}}

Please use the following actions:
1. analyze-ticket-classification with issueKey={{issue.key}}
2. suggest-ticket-assignee with issueKey={{issue.key}} and category from step 1
3. find-similar-tickets with issueKey={{issue.key}}

Provide recommendations in JSON format:
{
  "category": "string",
  "subCategory": "string",
  "priority": "High|Medium|Low",
  "urgency": "Urgent|Normal",
  "assignee": "string",
  "assigneeId": "string",
  "confidence": 85,
  "reasoning": "string",
  "similarTickets": []
}
```

4. **Save** をクリック

#### Step 4: チケット更新アクションの追加

1. **アクションを追加**
   - **New action** をクリック
   - **Edit issue** を選択

2. **フィールドを設定**
   - Priority: `{{rovo.response.priority}}`
   - Assignee: `{{rovo.response.assigneeId}}`
   - Labels: 追加
     - `ai-triaged`
     - `ai-category:{{rovo.response.category}}`
     - `ai-confidence:{{rovo.response.confidence}}`

3. **Save** をクリック

#### Step 5: ラベル削除アクションの追加

1. **アクションを追加**
   - **New action** をクリック
   - **Edit issue** を選択

2. **ラベルを削除**
   - Labels: 削除
     - `run-ai-triage`

3. **Save** をクリック

#### Step 6: ルールを保存して有効化

1. **ルール名を入力**
   - Name: **TriageNinja - Manual Triage**

2. **Turn on rule** をクリック

---

## テストと検証

### 自動トリアージのテスト

1. **新しいチケットを作成**
   ```
   Summary: Cannot connect to VPN from home
   Description: Getting authentication failed error
   Issue Type: Task
   Assignee: (空欄)
   ```

2. **5-10秒待つ**

3. **チケットを確認**
   - Priority が設定されているか
   - Assignee が割り当てられているか
   - Labels に `ai-triaged` が追加されているか

4. **Automation audit logを確認**
   - Project settings → Automation
   - 右上の **Audit log** をクリック
   - ルールが実行されたか確認

### 手動トリアージのテスト

1. **既存のチケットを開く**

2. **TriageNinja パネルを開く**
   - 右サイドバーの **AI Triage** パネル

3. **Run AI Triage ボタンをクリック**

4. **30秒以内に結果が表示されるか確認**
   - Category
   - Priority
   - Suggested Assignee
   - Confidence

5. **Apply Triage をクリック**

6. **チケットが更新されたか確認**

---

## トラブルシューティング

### Rovo Agentが表示されない

**原因:**
- Rovo Agent が組織で有効化されていない
- Jira プランが対応していない

**解決策:**
1. 組織管理者に Atlassian Rovo の有効化を依頼
2. Jira Premium 以上にアップグレード
3. Atlassian サポートに問い合わせ

### TriageNinja AI Agent が選択肢に表示されない

**原因:**
- アプリが正しくデプロイされていない
- manifest.yml の設定が不正

**解決策:**
1. Forge ログを確認
   ```bash
   forge logs --environment production --tail
   ```

2. manifest.yml を確認
   ```bash
   forge lint
   ```

3. 再デプロイ
   ```bash
   forge deploy --environment production
   forge install --upgrade --environment production
   ```

### Automationルールが実行されない

**原因:**
- 条件が一致していない
- ルールが無効化されている

**解決策:**
1. Audit log を確認
   - Project settings → Automation → Audit log

2. ルールの条件を確認
   - Issue type が一致しているか
   - Assignee が空か（自動トリアージの場合）
   - Label が正しいか（手動トリアージの場合）

3. ルールが有効化されているか確認
   - Automation → ルール名 → Status: **Enabled**

### Rovo Agentがエラーを返す

**原因:**
- プロンプトの形式が不正
- アクションのパラメータが不正

**解決策:**
1. Forge ログでエラー詳細を確認
   ```bash
   forge logs --environment production -n 100 | grep -i error
   ```

2. プロンプトの変数を確認
   - `{{issue.key}}` が正しく展開されているか
   - JSON 形式が正しいか

3. アクションのパラメータを確認
   - issueKey が文字列型か
   - category が文字列型か

---

## 参考リンク

- [Jira Automation Documentation](https://support.atlassian.com/jira-software-cloud/docs/what-is-automation/)
- [Atlassian Rovo Documentation](https://www.atlassian.com/software/rovo)
- [TriageNinja Automation Rules](./automation-rules.md)
- [Rovo Integration Guide](./rovo-integration.md)

---

## まとめ

1. ✅ Rovo Agent が利用可能か確認
2. ✅ Rule 1: 自動トリアージルールを作成
3. ✅ Rule 2: 手動トリアージルールを作成
4. ✅ テストチケットで動作確認
5. ✅ Audit log でルール実行を確認

これで、TriageNinja が Rovo Agent を使用して自動的にチケットをトリアージできるようになります！

