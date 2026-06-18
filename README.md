# Unityアーキテクト・ノート モバイル・同期 (Unity Architect Note - Mobile Sync)

Unityゲーム開発におけるスクリプトの依存関係・設計図（フローチャート）を管理しつつ、PCで記述したC#コードをクラウド経由でスマートフォンに同期し、外出先や電車内でもコードの確認・編集、およびタスク・時間管理ができるレスポンス対応Webアプリケーション。

---

## 1. 要件定義

### 【目的】
PCの前にいない時間（移動中など）でもUnityの設計やC#コードの確認・修正を進められる環境を提供する。設計図と実装コード、タスクをクラウドで一元化し、開発者の隙間時間を有効活用することを目的とする。

### 【利用者の入出力】
* **入力:**
    * PC/スマホからのノード作成・接続、およびC#コードの貼り付け・編集。
    * タスク情報（タスク名、ステータス）の更新、タイマーの開始/停止。
* **出力:**
    * クラウド（Supabase）経由でPC・スマホ間で完全同期されたノードマップとC#コード。
    * レスポンシブ対応したカンバン画面、作業時間の計測ログ。

### 【制約】
* **開発期間:** 4週間（MVP開発）
* **稼働環境:** Webブラウザ（PC / iOS / Android）
* **データ管理:** PC・スマホ間同期を実現するため、BaaS（Supabase）を利用したクラウド集中管理。
* **UI制限:** スマホの小画面に対応するため、モバイル表示時はノードマップをリスト/ツリー形式に自動最適化する。

### 【受け入れ基準】
1. PCで入力したノード情報とC#コードが、スマホ側を開いた際にリアルタイム（数秒以内）で同期・表示されること。
2. スマホの画面からC#コードのテキスト編集・保存ができ、PC側にも反映されること。
3. モバイル環境でもカンバンタスクのステータス変更、およびタイマーによる時間計測・保存が正常に動作すること。

### 【非目標（スコープ外）】
* Unityエディタとの直接的なローカルファイル自動同期（今回はブラウザへのコピペ運用に限定）。
* Gitリポジトリとの直接連携（コミット、プッシュ等の機能）。
* オフライン環境での完全同期（ネットワーク接続が必須の仕様とする）。

---

## 2. 設計図（4種類）

### ① ユースケース図
```mermaid
flowchart TD
    subgraph Actors [アクター]
        Developer((ゲーム開発者))
    end

    subgraph App [Unityアーキテクト・ノート Web]
        UC_Sync[PC・スマホ間でデータを同期する]
        UC_Canvas[設計図・コードを閲覧する]
        UC_Edit[C#コードを編集する]
        UC_Task[タスク・タイマーを管理する]
    end

    Developer --> UC_Canvas
    Developer --> UC_Edit
    Developer --> UC_Task

    UC_Canvas -.->|include| UC_Sync
    UC_Edit -.->|include| UC_Sync
    UC_Task -.->|include| UC_Sync


    ### ② クラス図
    classDiagram
    direction LR
    class User {
        +string id
        +string email
    }
    class Project {
        +string id
        +string userId
        +string name
        +DateTime updatedAt
    }
    class Node {
        +string id
        +string projectId
        +string label
        +string codeSnippet
        +float[2] position
    }
    class Task {
        +string id
        +string nodeId
        +string title
        +string status
        +int actualMinutes
    }

    User "1" *-- "0..*" Project : owns
    Project "1" *-- "0..*" Node : contains
    Project "1" *-- "0..*" Task : tracks
    Node "0..1" --> "0..1" Task : links

     ### ③ シーケンス図
     sequenceDiagram
    autonumber
    actor Dev as 開発者 (スマホ/電車内)
    participant UI as スマホ画面 (Next.js)
    participant DB as クラウド (Supabase)
    participant PC as PC画面 (ブラウザ)

    Note over Dev, PC: 【出先でのコード編集と同期フロー】
    Dev ->> UI: アプリを開きコード確認
    UI ->> DB: FetchLatestData(projectId)
    DB -->> UI: C#コード・ノード情報返却
    Dev ->> UI: コードを編集・保存ボタン押下
    UI ->> DB: UpdateCodeSnippet(nodeId, newCode)
    DB -->> UI: 保存完了通知
    
    Note over DB, PC: 【PC側での確認】
    PC ->> DB: 定期ポーリング / リアルタイム購読
    DB -->> PC: スマホ側での変更を検知・自動更新
    PC -->> PC: 画面上のC#コードが最新化される

    ### ④ 状態遷移図
    stateDiagram-v2
    [*] --> LoginScreen : アプリ起動
    LoginScreen --> ProjectDashboard : 認証成功
    
    state ProjectDashboard {
        [*] --> ViewMode : プロジェクト選択
        ViewMode --> CodeEditingMode : コード編集開始 (PC/スマホ)
        CodeEditingMode --> ViewMode : 保存・同期完了
        ViewMode --> TaskTimerMode : タイマー開始
        TaskTimerMode --> ViewMode : タイマー停止・実績保存
    }
    
    ProjectDashboard --> [*] : ログアウト