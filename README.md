# Unity Architect Note

Unity Architect Noteは、Unityゲーム開発で使用するC#スクリプトをクラウド経由でWebアプリと同期し、PCやスマートフォンからコード確認・編集、タスク管理を行える開発支援ツールです。

## 概要

本システムでは、Unity Editor拡張からUnityプロジェクト内のC#スクリプトをSupabaseへアップロードし、Next.jsで作成したWebアプリ上でコードを確認・編集できます。

Webアプリで編集したコードは、Unity Editor拡張のDownload & Apply機能によってUnityプロジェクト内の.csファイルへ反映できます。

## 主な機能

- ユーザー登録・ログイン
- プロジェクト作成
- C#コードファイル登録
- C#コード表示
- C#コード編集・保存
- タスク追加
- タスクステータス管理
- Unity EditorからC#コードをSupabaseへアップロード
- Webで編集したC#コードをUnityへ反映
- 上書き前のバックアップ作成
- Unity Editor拡張の設定保存

## 使用技術

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Authentication
- Unity
- C#
- Unity Editor拡張
- Visual Studio Code

## データベース

使用した主なテーブルは以下です。

- projects
- code_files
- tasks
- time_logs

## Unity連携の流れ

```text
Unity Editor
↓
C#スクリプトをSupabaseへアップロード
↓
Webアプリでコードを確認・編集
↓
Supabaseに保存
↓
Unity EditorでDownload & Apply
↓
Unityプロジェクト内の.csファイルへ反映