# Git Hooks

このディレクトリには、プロジェクトで使用するGit hooksが含まれています。

## 概要

Git hooksは、Gitの特定のアクションが発生したときに自動的に実行されるスクリプトです。
このプロジェクトでは、セキュリティとコード品質を保証するためにhooksを使用しています。

## インストール済みHooks

### Pre-push Hook (Gitleaks)

**場所**: `.kiro/hooks/common/scripts/pre-push-gitleaks.sh`

**目的**: コミットに機密情報が含まれていないかチェック

**動作**:
- プッシュ前に自動実行
- Gitleaksを使用してシークレットをスキャン
- 機密情報が検出された場合、プッシュをブロック

**検出対象**:
- AWS Access Key / Secret Key
- GitHub Personal Access Token
- Private Keys (RSA, DSA, EC)
- API Keys
- Passwords
- その他の機密情報

## セットアップ

### 初回セットアップ

```bash
# 1. Gitleaksをインストール
brew install gitleaks  # macOS
# その他のプラットフォーム: https://github.com/gitleaks/gitleaks#installing

# 2. Git hooksをセットアップ
./.kiro/hooks/common/scripts/setup-hooks.sh
```

### 手動セットアップ

```bash
# シンボリックリンクを作成
ln -sf ../../.kiro/hooks/common/scripts/pre-push-gitleaks.sh .git/hooks/pre-push

# 実行権限を付与
chmod +x .kiro/hooks/common/scripts/pre-push-gitleaks.sh
```

## 使用方法

### 通常のプッシュ

```bash
git push origin your-branch
```

Hookが自動的に実行され、機密情報がチェックされます。

### Hookをバイパス（非推奨）

```bash
# 緊急時のみ使用
git push --no-verify
```

⚠️ **警告**: `--no-verify`の使用は推奨されません。機密情報が漏洩する可能性があります。

## トラブルシューティング

### Gitleaksがインストールされていない

```
❌ Error: gitleaks is not installed
```

**解決方法**:
```bash
# macOS
brew install gitleaks

# Linux
# https://github.com/gitleaks/gitleaks#installing
```

### 機密情報が検出された

```
❌ Secrets detected!
```

**解決方法**:
1. 検出された機密情報をコードから削除
2. 環境変数を使用するように変更
3. `.gitignore`に機密ファイルを追加
4. 既にコミット済みの場合:
   - `git filter-branch`または`BFG Repo-Cleaner`を使用
   - 漏洩した認証情報をローテーション（無効化＆再発行）

### Hookが実行されない

```bash
# Hookが存在するか確認
ls -la .git/hooks/pre-push

# シンボリックリンクを再作成
./.kiro/hooks/common/scripts/setup-hooks.sh
```

## ディレクトリ構造

```
.kiro/hooks/common/
├── README.md                           # このファイル
└── scripts/
    ├── pre-push-gitleaks.sh           # Pre-push hook本体
    └── setup-hooks.sh                 # Hookセットアップスクリプト
```

## 新しいHookの追加

新しいhookを追加する場合:

1. **スクリプトを作成**
   ```bash
   touch .kiro/hooks/common/scripts/your-hook.sh
   chmod +x .kiro/hooks/common/scripts/your-hook.sh
   ```

2. **setup-hooks.shに追加**
   ```bash
   # setup-hooks.shに以下を追加
   ln -sf ../../.kiro/hooks/common/scripts/your-hook.sh "$REPO_ROOT/.git/hooks/your-hook"
   ```

3. **READMEを更新**
   - このファイルに新しいhookのドキュメントを追加

## ベストプラクティス

### 機密情報の管理

✅ **推奨**:
- 環境変数を使用（`.env.local`、gitignore済み）
- AWS Secrets Manager / Parameter Store
- Forge環境変数（`forge variables`）

❌ **非推奨**:
- ハードコードされた認証情報
- コミットされた`.env`ファイル
- コード内のAPIキー

### Hookのメンテナンス

- 定期的にGitleaksを更新: `brew upgrade gitleaks`
- 新しいチームメンバーにセットアップを案内
- CIでもGitleaksを実行（二重チェック）

## 関連ドキュメント

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Project Security Standards](../../steering/common/project-standards.md)

## サポート

問題が発生した場合:
1. このREADMEのトラブルシューティングセクションを確認
2. GitHub Issuesで報告
3. チームメンバーに相談
