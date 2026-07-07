"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  name: string;
};

type CodeFile = {
  id: string;
  project_id: string;
  unity_path: string;
  file_name: string;
  content: string;
  updated_at: string;
};

type Task = {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string;
  status: "todo" | "doing" | "done";
  actual_minutes: number;
  current_timer_started_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [unityPath, setUnityPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");

  const [parentTaskTitle, setParentTaskTitle] = useState("");
  const [childTaskTitle, setChildTaskTitle] = useState("");
  const [selectedParentTaskId, setSelectedParentTaskId] = useState("");

  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setProject(data);
  };

  const fetchCodeFiles = async () => {
    const { data, error } = await supabase
      .from("code_files")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setCodeFiles(data ?? []);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setTasks(data ?? []);
  };

  const loadData = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      location.href = "/login";
      return;
    }

    await fetchProject();
    await fetchCodeFiles();
    await fetchTasks();

    setLoading(false);
  };

  const createCodeFile = async () => {
    if (!unityPath.trim() || !fileName.trim()) {
      alert("Unityパスとファイル名を入力してください。");
      return;
    }

    const { error } = await supabase.from("code_files").insert({
      project_id: projectId,
      unity_path: unityPath,
      file_name: fileName,
      content,
      last_synced_from: "web",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setUnityPath("");
    setFileName("");
    setContent("");

    fetchCodeFiles();
  };

  const createParentTask = async () => {
  if (!parentTaskTitle.trim()) {
    alert("大タスク名を入力してください。");
    return;
  }

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: parentTaskTitle,
    status: "todo",
    parent_task_id: null,
  });

  if (error) {
    alert(error.message);
    return;
  }

  setParentTaskTitle("");
  fetchTasks();
};

const createChildTask = async () => {
  if (!selectedParentTaskId) {
    alert("大タスクを選択してください。");
    return;
  }

  if (!childTaskTitle.trim()) {
    alert("小タスク名を入力してください。");
    return;
  }

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: childTaskTitle,
    status: "todo",
    parent_task_id: selectedParentTaskId,
  });

  if (error) {
    alert(error.message);
    return;
  }

  setChildTaskTitle("");
  fetchTasks();
};

 const updateTaskStatus = async (
  taskId: string,
  nextStatus: "todo" | "doing" | "done"
) => {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    alert(error.message);
    return;
  }

  fetchTasks();
};

const startTaskTimer = async (taskId: string) => {
  const startedAt = new Date().toISOString();

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "doing",
      current_timer_started_at: startedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    alert(error.message);
    return;
  }

  fetchTasks();
};

const stopTaskTimer = async (task: Task) => {
  if (!task.current_timer_started_at) {
    alert("タイマーが開始されていません。");
    return;
  }

  const startedAt = new Date(task.current_timer_started_at);
  const endedAt = new Date();

  const diffMs = endedAt.getTime() - startedAt.getTime();
  const durationMinutes = Math.max(1, Math.ceil(diffMs / 1000 / 60));

  const { error: logError } = await supabase.from("time_logs").insert({
    task_id: task.id,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_minutes: durationMinutes,
  });

  if (logError) {
    alert(logError.message);
    return;
  }

  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      actual_minutes: task.actual_minutes + durationMinutes,
      current_timer_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  if (taskError) {
    alert(taskError.message);
    return;
  }

  fetchTasks();
};

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);



const deleteTask = async (taskId: string) => {
  const ok = confirm("このタスクを削除しますか？");

  if (!ok) return;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    alert(error.message);
    return;
  }

  fetchTasks();
};

const parentTasks = tasks.filter((task) => task.parent_task_id === null);

const getChildTasks = (parentTaskId: string) => {
  return tasks.filter((task) => task.parent_task_id === parentTaskId);
};

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <Link href="/projects" className="text-sm text-blue-400 hover:underline">
            ← プロジェクト一覧へ戻る
          </Link>

          <div>
            <p className="text-sm text-blue-400 font-semibold">
              Unity Architect Note
            </p>
            <h1 className="text-3xl font-bold">{project?.name}</h1>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h2 className="text-xl font-bold">C#コードファイル登録</h2>

          <div className="grid gap-3">
            <input
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="Unityパス 例：Assets/Scripts/PlayerController.cs"
              value={unityPath}
              onChange={(e) => setUnityPath(e.target.value)}
            />

            <input
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="ファイル名 例：PlayerController.cs"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />

            <textarea
              className="min-h-48 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none focus:border-blue-500"
              placeholder={
                "using UnityEngine;\n\npublic class PlayerController : MonoBehaviour\n{\n    void Start()\n    {\n    }\n}"
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button
              onClick={createCodeFile}
              className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500"
            >
              登録
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">コードファイル一覧</h2>

          {codeFiles.length === 0 ? (
            <p className="text-slate-400">
              まだコードファイルが登録されていません。
            </p>
          ) : (
            <div className="grid gap-4">
              {codeFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/projects/${projectId}/code/${file.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-blue-500"
                >
                  <h3 className="text-lg font-bold">{file.file_name}</h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {file.unity_path}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    更新日: {new Date(file.updated_at).toLocaleString()}
                  </p>

                  <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-200">
                    <code>{file.content}</code>
                  </pre>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6">
  <h2 className="text-xl font-bold">タスク追加</h2>

  <div className="space-y-3">
    <h3 className="font-semibold">大タスクを追加</h3>

    <div className="flex flex-col sm:flex-row gap-3">
      <input
        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
        placeholder="例：レベルデザイン"
        value={parentTaskTitle}
        onChange={(e) => setParentTaskTitle(e.target.value)}
      />

      <button
        onClick={createParentTask}
        className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500"
      >
        大タスク追加
      </button>
    </div>
  </div>

  <div className="space-y-3">
    <h3 className="font-semibold">小タスクを追加</h3>

    <div className="grid gap-3">
      <select
        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
        value={selectedParentTaskId}
        onChange={(e) => setSelectedParentTaskId(e.target.value)}
      >
        <option value="">大タスクを選択</option>
        {parentTasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </select>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
          placeholder="例：ステージ1の敵配置を作る"
          value={childTaskTitle}
          onChange={(e) => setChildTaskTitle(e.target.value)}
        />

        <button
          onClick={createChildTask}
          className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500"
        >
          小タスク追加
        </button>
      </div>
    </div>
  </div>
</section>

        <section className="space-y-4">
  <h2 className="text-xl font-bold">タスク管理</h2>

  {parentTasks.length === 0 ? (
    <p className="text-slate-400">
      まだ大タスクがありません。
    </p>
  ) : (
    <div className="space-y-5">
      {parentTasks.map((parentTask) => {
        const childTasks = getChildTasks(parentTask.id);

       const todoTasks = childTasks
  .filter((task) => task.status === "todo")
  .sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

const doingTasks = childTasks
  .filter((task) => task.status === "doing")
  .sort(
    (a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  );

const doneTasks = childTasks
  .filter((task) => task.status === "done")
  .sort(
    (a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  );

        return (
          <div
            key={parentTask.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
          >
           <div>
  <p className="text-xs text-blue-400 font-semibold">大タスク</p>
  <h3 className="text-2xl font-bold">{parentTask.title}</h3>
</div>

            <div className="grid gap-4 md:grid-cols-3">
              <TaskColumn
  title="未着手"
  tasks={todoTasks}
  nextLabel="作業中へ"
  nextStatus="doing"
  onChangeStatus={updateTaskStatus}
  onStartTimer={startTaskTimer}
  onStopTimer={stopTaskTimer}
  onDeleteTask={deleteTask}
  now={now}
/>

              <TaskColumn
  title="作業中"
  tasks={doingTasks}
  nextLabel="完了へ"
  nextStatus="done"
  onChangeStatus={updateTaskStatus}
  onStartTimer={startTaskTimer}
  onStopTimer={stopTaskTimer}
  onDeleteTask={deleteTask}
  now={now}
/>

              <TaskColumn
  title="完了"
  tasks={doneTasks}
  nextLabel="未着手へ戻す"
  nextStatus="todo"
  onChangeStatus={updateTaskStatus}
  onStartTimer={startTaskTimer}
  onStopTimer={stopTaskTimer}
  onDeleteTask={deleteTask}
  now={now}
/>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>
      </div>
    </main>
  );
}



function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}分`;
  }

  return `${hours}時間${mins}分`;
}

function formatRunningTime(startedAt: string, now: Date) {
  const start = new Date(startedAt);
  const diffMs = now.getTime() - start.getTime();

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}分${seconds}秒`;
}

type TaskColumnProps = {
  title: string;
  tasks: Task[];
  nextLabel: string;
  nextStatus: "todo" | "doing" | "done";
  onChangeStatus: (
    taskId: string,
    nextStatus: "todo" | "doing" | "done"
  ) => void;
  onStartTimer: (taskId: string) => void;
  onStopTimer: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  now: Date;
};
``

function TaskColumn({
  title,
  tasks,
  nextLabel,
  nextStatus,
  onChangeStatus,
  onStartTimer,
  onStopTimer,
  onDeleteTask,
  now,
}: TaskColumnProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <h3 className="font-bold">{title}</h3>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">タスクはありません。</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
            >
              <p className="font-semibold">{task.title}</p>

              <p className="text-xs text-slate-500">
  作成日: {new Date(task.created_at).toLocaleString()}
</p>

<p className="text-xs text-slate-400">
  累計作業時間: {formatMinutes(task.actual_minutes ?? 0)}
</p>

{task.current_timer_started_at && (
  <p className="text-xs text-green-400">
    計測中: {formatRunningTime(task.current_timer_started_at, now)}
  </p>
)}

<div className="grid gap-2">
  {task.current_timer_started_at ? (
    <button
      onClick={() => onStopTimer(task)}
      className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-500"
    >
      停止して記録
    </button>
  ) : (
    <button
      onClick={() => onStartTimer(task.id)}
      className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-bold hover:bg-green-500"
    >
      作業開始
    </button>
  )}

  {!task.current_timer_started_at && (
    <button
      onClick={() => onChangeStatus(task.id, nextStatus)}
      className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
    >
      {nextLabel}
    </button>
  )}

  {!task.current_timer_started_at && (
    <button
      onClick={() => onDeleteTask(task.id)}
      className="w-full rounded-lg border border-red-500 px-3 py-2 text-sm text-red-400 hover:bg-red-950"
    >
      削除
    </button>
  )}
</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}