# Atlassian Rovo 料金情報

## 結論

**はい、Premiumプランが必要です。**

ただし、**TriageNinjaはRovo Agentなしでも動作します**（現在の状態）。

---

## Atlassian Rovo の料金プラン

### 必要なプラン

Atlassian Rovoを利用するには、以下のいずれかのプランが必要です：

- ✅ **Standard** プラン
- ✅ **Premium** プラン  
- ✅ **Enterprise** プラン

❌ **Free** プランでは利用できません

### Rovo の機能

Rovoには以下の機能が含まれます：

1. **Rovo Search** - AI検索
2. **Rovo Chat** - AIチャット
3. **Rovo Agents** - カスタムAIエージェント（TriageNinjaが使用）
4. **Rovo Studio** - ワークフロー自動化

### Rovo Dev（別料金）

- **Rovo Dev** は開発者向けの別製品
- 料金: $20/開発者/月
- TriageNinjaには**不要**

---

## TriageNinja の動作モード

### モード1: Rovo Agentあり（推奨）

**必要なもの:**
- Jira Standard/Premium/Enterprise プラン
- Atlassian Rovo 有効化

**メリット:**
- ✅ AI精度が高い
- ✅ 学習して改善される
- ✅ 複雑なパターンを認識
- ✅ 自動トリアージが可能

**動作:**
```
チケット作成
→ Jira Automation
→ Rovo Agent（AI分析）
→ 自動分類・担当者割り当て
```

### モード2: Rovo Agentなし（現在の状態）

**必要なもの:**
- Jira Free プランでもOK
- TriageNinjaアプリのみ

**メリット:**
- ✅ 追加費用なし
- ✅ すぐに使える
- ✅ 基本的なトリアージは可能

**制限:**
- ⚠️ キーワードベースの分類（精度は低め）
- ⚠️ 学習機能なし
- ⚠️ 手動トリアージのみ（自動トリアージ不可）

**動作:**
```
ユーザーが「Run AI Triage」クリック
→ キーワードマッチング
→ ワークロードベースの担当者選択
→ 結果表示
```

---

## 料金比較

### Jira プラン料金（参考）

| プラン | 料金（概算） | Rovo利用 |
|--------|------------|----------|
| Free | $0 | ❌ 不可 |
| Standard | ~$8/ユーザー/月 | ✅ 可能 |
| Premium | ~$16/ユーザー/月 | ✅ 可能 |
| Enterprise | 要問い合わせ | ✅ 可能 |

※ 正確な料金はAtlassianの公式サイトで確認してください

### TriageNinja のコスト

| 項目 | コスト |
|------|--------|
| TriageNinjaアプリ | **無料** |
| Rovo Agent（オプション） | Jira Standard以上のプラン料金に含まれる |

---

## 推奨プラン

### 小規模チーム（1-10人）

**推奨: Rovo Agentなし（現在の状態）**

理由:
- コストを抑えられる
- 手動トリアージで十分
- チケット数が少ない

### 中規模チーム（10-50人）

**推奨: Jira Standard + Rovo Agent**

理由:
- チケット数が増える
- 自動トリアージで時間節約
- ROIが高い

### 大規模チーム（50人以上）

**推奨: Jira Premium/Enterprise + Rovo Agent**

理由:
- 大量のチケット処理
- 自動化が必須
- 高度な機能が必要

---

## 現在の状態で使える機能

### ✅ 使える機能（Rovo Agentなし）

1. **ダッシュボード**
   - 統計表示
   - チケット一覧
   - フィルタリング

2. **手動トリアージ**
   - 「Run AI Triage」ボタン
   - カテゴリ分類（キーワードベース）
   - 担当者提案（ワークロードベース）
   - 優先度提案

3. **オートトリアージトグル**
   - ON/OFF切り替え（UI上）
   - 設定保存

### ❌ 使えない機能（Rovo Agent必要）

1. **自動トリアージ**
   - チケット作成時の自動分類
   - 自動担当者割り当て

2. **AI学習**
   - 履歴からの学習
   - 精度向上

3. **高度な分析**
   - 複雑なパターン認識
   - コンテキスト理解

---

## よくある質問

### Q1: Rovo Agentなしでも使えますか？

**A:** はい、使えます。現在の状態がまさにそれです。キーワードベースの分類で基本的なトリアージが可能です。

### Q2: 後からRovo Agentを追加できますか？

**A:** はい、できます。Jira Standard以上にアップグレードして、Jira Automationルールを設定するだけです。

### Q3: Rovo Agentの精度はどのくらい向上しますか？

**A:** 一般的に：
- キーワードベース: 60-70%の精度
- Rovo Agent: 85-95%の精度

### Q4: 無料トライアルはありますか？

**A:** Atlassian Rovoの無料トライアルについては、Atlassianの営業に問い合わせてください。

### Q5: 今すぐアップグレードすべきですか？

**A:** 以下の場合はアップグレードを検討：
- チケット数が多い（月100件以上）
- トリアージに時間がかかっている
- 精度向上が必要

以下の場合は現状維持でOK：
- チケット数が少ない（月50件以下）
- 手動トリアージで問題ない
- コストを抑えたい

---

## 次のステップ

### Rovo Agentを使いたい場合

1. **Jiraプランを確認**
   - 現在のプラン: https://admin.atlassian.com
   - Standard/Premium/Enterpriseか確認

2. **アップグレード（必要な場合）**
   - Atlassian営業に問い合わせ
   - または、管理画面からアップグレード

3. **Rovo Agentを有効化**
   - 組織管理者に依頼
   - Atlassian Rovoを有効化

4. **Jira Automationルールを設定**
   - `docs/quick-setup-rovo-agent.md` に従う
   - 5分で完了

### 現状維持の場合

- ✅ そのまま使い続けられます
- ✅ 追加費用なし
- ✅ 基本機能は全て利用可能

---

## 参考リンク

- [Atlassian Rovo 公式サイト](https://www.atlassian.com/software/rovo)
- [Rovo 料金ページ](https://www.atlassian.com/software/rovo/pricing)
- [Jira 料金ページ](https://www.atlassian.com/software/jira/pricing)
- [Rovo セットアップガイド](./quick-setup-rovo-agent.md)

---

## まとめ

| 項目 | Rovo Agentなし | Rovo Agentあり |
|------|----------------|----------------|
| **料金** | 無料（Jira Freeでも可） | Jira Standard以上 |
| **精度** | 60-70% | 85-95% |
| **自動トリアージ** | ❌ | ✅ |
| **学習機能** | ❌ | ✅ |
| **推奨チーム規模** | 1-10人 | 10人以上 |

**結論:** TriageNinjaは**Rovo Agentなしでも十分使えます**。チームの規模とニーズに応じて、後からアップグレードを検討してください。

