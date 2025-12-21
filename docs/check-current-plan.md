# 現在のJiraプランとRovo Agent利用可否の確認方法

## ステップ1: 現在のJiraプランを確認

### 方法1: Atlassian Administration（推奨）

1. **Atlassian Administrationにアクセス**
   - https://admin.atlassian.com にアクセス
   - Atlassian アカウントでログイン

2. **組織を選択**
   - 複数の組織がある場合は、kumagaias.atlassian.net の組織を選択

3. **Billing → Subscriptions**
   - 左メニューから **Billing** をクリック
   - **Subscriptions** タブを選択

4. **Jiraのプランを確認**
   - **Jira Software** または **Jira Service Management** の行を確認
   - プラン名が表示されます：
     - ✅ **Standard** → Rovo Agent 使える
     - ✅ **Premium** → Rovo Agent 使える
     - ✅ **Enterprise** → Rovo Agent 使える
     - ❌ **Free** → Rovo Agent 使えない

### 方法2: Jira Site Settings

1. **Jiraサイトにアクセス**
   - https://kumagaias.atlassian.net

2. **Settings → System**
   - 右上の ⚙️ アイコン → **System**

3. **Atlassian Marketplace**
   - 左メニューから **Atlassian Marketplace** を選択
   - ページ上部に現在のプラン情報が表示される

### 方法3: 直接確認（最速）

1. **Jira Automationで確認**
   - Project settings → Automation
   - Create rule → New action
   - 「Rovo」で検索

2. **結果**
   - ✅ **「Invoke Rovo Agent」が表示される** → Rovo Agent 使える！
   - ❌ **表示されない** → Rovo Agent 使えない（プランアップグレード必要）

---

## ステップ2: Rovo Agentの有効化状況を確認

### Rovo Agentが使える場合（Standard以上）

1. **Atlassian Administration**
   - https://admin.atlassian.com

2. **Products → Rovo**
   - 左メニューから **Products** を選択
   - **Rovo** が表示されているか確認

3. **Rovo Settings**
   - Rovo が有効化されているか確認
   - 無効の場合は **Enable Rovo** をクリック

---

## ステップ3: 結果に応じた対応

### ケース1: Standard/Premium/Enterprise プラン ✅

**状況:** Rovo Agent が使える！

**次のステップ:**
1. Rovo Agentが有効化されているか確認（ステップ2）
2. 有効化されていない場合は、組織管理者に依頼
3. 有効化されている場合は、Jira Automationルールを設定
   - `docs/quick-setup-rovo-agent.md` に従って5分で完了

### ケース2: Free プラン ❌

**状況:** Rovo Agent が使えない

**選択肢:**

#### 選択肢A: プランをアップグレード（推奨）

**メリット:**
- ✅ Rovo Agent が使える（TriageNinjaの本来の価値）
- ✅ 自動トリアージで時間節約
- ✅ AI精度85-95%

**料金:**
- Jira Standard: ~$8/ユーザー/月
- Jira Premium: ~$16/ユーザー/月

**手順:**
1. Atlassian Administration → Billing → Subscriptions
2. Jira の **Upgrade** ボタンをクリック
3. Standard または Premium を選択
4. 支払い情報を入力
5. アップグレード完了後、Rovo Agentを有効化

#### 選択肢B: 無料トライアルを試す

**手順:**
1. Atlassian営業に問い合わせ
   - https://www.atlassian.com/company/contact
2. Rovo Agentの無料トライアルを依頼
3. トライアル期間中にTriageNinjaを評価

#### 選択肢C: 現状維持（非推奨）

**制限:**
- ⚠️ キーワードベースの分類のみ（精度60-70%）
- ⚠️ 自動トリアージ不可
- ⚠️ 学習機能なし

**TriageNinjaの価値が大幅に低下します**

---

## ステップ4: アップグレード後の設定

### 1. Rovo Agentを有効化

1. **Atlassian Administration**
   - https://admin.atlassian.com

2. **Products → Rovo**
   - **Enable Rovo** をクリック

3. **確認**
   - Rovo が有効化されたことを確認

### 2. Jira Automationルールを設定

**所要時間: 5分**

1. **クイックセットアップガイドに従う**
   - `docs/quick-setup-rovo-agent.md` を開く
   - ステップ2とステップ3を実行

2. **ルール作成**
   - Rule 1: 自動トリアージ（チケット作成時）
   - Rule 2: 手動トリアージ（ラベル追加時）

3. **テスト**
   - テストチケットを作成
   - 自動トリアージが動作するか確認

### 3. 動作確認

1. **新しいチケットを作成**
   ```
   Summary: Test VPN connection issue
   Issue Type: Task
   Assignee: (空欄)
   ```

2. **10秒待つ**

3. **確認**
   - ✅ Priority が自動設定される
   - ✅ Assignee が自動割り当てされる
   - ✅ Label `ai-triaged` が追加される

4. **Forge ログを確認**
   ```bash
   forge logs --environment production --tail
   ```

5. **期待されるログ**
   ```
   INFO [analyzeTicketClassification] Action invoked
   INFO [analyzeTicketClassification] Success
   INFO [suggestTicketAssignee] Action invoked
   INFO [suggestTicketAssignee] Success
   ```

---

## よくある質問

### Q1: 今すぐプランを確認できますか？

**A:** はい、以下のURLにアクセスしてください：
- https://admin.atlassian.com/billing/subscriptions

### Q2: アップグレードにどのくらい時間がかかりますか？

**A:** 即座に反映されます。支払い完了後、すぐにRovo Agentが使えるようになります。

### Q3: アップグレード後、すぐにTriageNinjaが動きますか？

**A:** Jira Automationルールの設定が必要です（5分）。設定後すぐに動作します。

### Q4: ダウングレードできますか？

**A:** はい、いつでもダウングレード可能です。ただし、Rovo Agentは使えなくなります。

### Q5: 他のチームメンバーも料金がかかりますか？

**A:** はい、ユーザー数に応じた料金がかかります。例：
- 5ユーザー × $8/月 = $40/月（Standard）
- 10ユーザー × $8/月 = $80/月（Standard）

---

## 推奨アクション

### 今すぐやること

1. **現在のプランを確認**
   - https://admin.atlassian.com/billing/subscriptions
   - または、Jira Automation で「Invoke Rovo Agent」が表示されるか確認

2. **結果をメモ**
   - プラン名: ___________
   - Rovo Agent 利用可否: ___________

3. **次のステップを決定**
   - Standard以上 → Jira Automationルール設定へ
   - Free → アップグレード検討

### アップグレードを決めた場合

1. **予算を確認**
   - ユーザー数 × $8/月（Standard）
   - または、ユーザー数 × $16/月（Premium）

2. **承認を取得**
   - 上司や経理部門に相談

3. **アップグレード実行**
   - Atlassian Administration → Billing → Upgrade

4. **Rovo Agent設定**
   - `docs/quick-setup-rovo-agent.md` に従う

---

## サポート

質問や問題がある場合：

1. **Atlassian サポート**
   - https://support.atlassian.com

2. **Atlassian 営業**
   - https://www.atlassian.com/company/contact

3. **TriageNinja ドキュメント**
   - `docs/quick-setup-rovo-agent.md`
   - `docs/jira-automation-setup-guide.md`
   - `docs/rovo-pricing-info.md`

---

## まとめ

1. ✅ 現在のプランを確認（1分）
2. ✅ Standard以上ならRovo Agent設定（5分）
3. ✅ Freeならアップグレード検討
4. ✅ 設定完了後、TriageNinjaの本来の価値を実感！

**TriageNinjaはRovo Agentと組み合わせることで、真の価値を発揮します。**

