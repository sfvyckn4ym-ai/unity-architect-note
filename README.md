# Unityアーキテクト・ノート (Unity Architect Note)

Unityゲーム開発におけるスクリプトの依存関係・設計図（フローチャート）と、実装タスク・作業時間を1つのキャンバス上で一元管理できる開発支援デスクトップアプリケーション。

---

## 1. 要件定義

### 【目的】
Unityゲーム開発における「アーキテクチャのスパゲティ化」と「実装タスクの不一致」を解消する。設計図と実装コード、それに紐づくタスクと作業時間を可視化し、開発効率の向上と工数見積もりの精度向上を目的とする。

### 【利用者の入出力】
* **入力:**
    * キャンバス上でのノード作成（クラス名、シーン名等の入力）と接続。
    * タスク情報（タスク名、予定時間、進捗ステータス）。
    * タイマーの開始/停止クリック。
    * 関連付けるUnityのC#スクリプト名（手動入力）。
* **出力:**
    * 視覚化されたノード構造図（関係性マップ）。
    * カンバン形式のタスク一覧および予定vs実績時間。
    * プロジェクトごとの管理データファイル（JSON形式）。

### 【制約】
* **開発期間:** 4週間（MVP開発）
* **稼働環境:** Windows / macOS（Tauriフレームワークによるクロスプラットフォーム）
* **動作負荷:** Unityエディタと同時起動するため、メモリ消費量を常時100MB以下に抑える。
* **データ管理:** 外部サーバーは使わず、Git管理が容易なローカル完結型（JSON）とする。

### 【受け入れ基準】
1.  `React Flow` を用い、ノードの追加・削除・線での結合が正常に動作すること。
2.  ノードから1クリックでタスク（カンバンカード）を生成でき、相互にデータが同期されること。
3.  各タスクにストップウォッチ機能があり、計測された累積時間が分単位でデータ保存されること。
4.  アプリ終了後も、キャンバスの配置とタスク状態が次回起動時に完全に復元されること。

### 【非目標（スコープ外）】
* C#コードを自動スキャンして依存関係を自動描画する機能（手動マッピングに限定）。
* アプリ内からのGitコミットやプッシュ、コンフリクト解消機能。
* 複数ユーザーによる同一キャンバスのリアルタイム同時編集機能。

---

## 2. 設計図（4種類）

### ① ユースケース図
```mermaid
flowchart TD
    subgraph Actors [アクター]
        Developer((ゲーム開発者))
    end

    subgraph App [Unityアーキテクト・ノート]
        UC_Proj[プロジェクトを管理する]
        UC_Canvas[設計図を編集する]
        UC_Node[ノードを操作する]
        UC_Link[C#スクリプトを紐付ける]
        UC_Task[タスクを管理する]
        UC_GenTask[ノードからタスクを生成する]
        UC_Time[作業時間を計測する]
        UC_Save[データを自動保存する]
    end

    Developer --> UC_Proj
    Developer --> UC_Canvas
    Developer --> UC_Task

    UC_Canvas -.->|include| UC_Node
    UC_Node -.->|extend| UC_Link
    UC_Node -.->|extend| UC_GenTask
    UC_Task -.->|include| UC_Time
    UC_Canvas -.->|include| UC_Save
    UC_Task -.->|include| UC_Save

    classDiagram
    direction LR
    class Project {
        +string id
        +string name
        +string unityProjectPath
        +DateTime createdAt
        +save() void
    }
    class Canvas {
        +string id
        +float zoom
        +float[2] position
    }
    class Node {
        +string id
        +string label
        +string type
        +float[2] position
        +string scriptPath
        +string notes
    }
    class Edge {
        +string id
        +string sourceNodeId
        +string targetNodeId
    }
    class Task {
        +string id
        +string nodeId
        +string title
        +string status
        +int estimatedMinutes
        +int actualMinutes
        +bool isTimerRunning
    }
    class TimeLog {
        +string id
        +DateTime startTime
        +int durationMinutes
    }

    Project "1" *-- "1" Canvas : contains
    Project "1" *-- "0..*" Task : tracks
    Canvas "1" *-- "0..*" Node : contains
    Canvas "1" *-- "0..*" Edge : contains
    Node "0..1" --> "0..1" Task : generates
    Task "1" *-- "0..*" TimeLog : records

    sequenceDiagram
    autonumber
    actor Developer as ゲーム開発者
    participant UI as 画面 (React)
    participant Ctrl as コントローラ (Tauri)
    participant Model as モデル (JSON File)

    Note over Developer, Model: 【タスク生成フロー】
    Developer ->> UI: ノードを右クリック ➔ 「タスク生成」
    UI ->> Ctrl: taskCreationRequest(nodeId, nodeLabel)
    Ctrl ->> Model: 既存タスクの有無を検証
    alt 未存在の場合
        Ctrl ->> Model: createTask(nodeId, title, status="Todo")
        Ctrl -->> UI: タスク生成成功通知
        UI -->> Developer: カンバンに表示
    else 存在する場合
        Ctrl -->> UI: エラー通知
    end

    Note over Developer, Model: 【タイマー計測フロー】
    Developer ->> UI: 「タイマー開始」をクリック
    UI ->> Ctrl: toggleTimerRequest(taskId)
    loop 1分ごとの定期処理
        Ctrl ->> Model: incrementActualMinutes(taskId, +1)
        Ctrl -->> UI: 最新の実績時間をプッシュ
        UI -->> Developer: タイマー表示更新
    end

    stateDiagram-v2
    [*] --> ProjectSelection : アプリ起動
    ProjectSelection --> CanvasView : プロジェクト選択
    
    state CanvasView {
        [*] --> Idle
        Idle --> NodeEditing : ノード追加/編集
        NodeEditing --> Idle : 保存
    }
    
    CanvasView --> TaskBoardView : 画面切り替え
    
    state TaskBoardView {
        [*] --> Todo
        Todo --> Progress : タスク着手
        state Progress {
            [*] --> TimerOff
            TimerOff --> TimerRunning : タイマー開始
            TimerRunning --> TimerOff : タイマー停止
        }
        Progress --> Done : タスク完了
    }
    
    TaskBoardView --> CanvasView : 画面切り替え
    CanvasView --> [*] : アプリ終了

    