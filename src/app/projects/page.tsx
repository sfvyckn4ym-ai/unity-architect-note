"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  created_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setProjects(data ?? []);
    setLoading(false);
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      alert("プロジェクト名を入力してください。");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      location.href = "/login";
      return;
    }

    const { error } = await supabase.from("projects").insert({
      name: projectName,
      user_id: user.id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setProjectName("");
    fetchProjects();
  };

  const deleteProject = async (projectId: string) => {
  const ok = confirm(
    "このプロジェクトを削除しますか？ 関連するコードファイルやタスクも削除されます。"
  );

  if (!ok) return;

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    alert(error.message);
    return;
  }

  fetchProjects();
};

  const signOut = async () => {
    await supabase.auth.signOut();
    location.href = "/login";
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400 font-semibold">
              Unity Architect Note
            </p>
            <h1 className="text-3xl font-bold">プロジェクト一覧</h1>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            ログアウト
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h2 className="text-xl font-bold">新規プロジェクト作成</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="例：アクションゲーム"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />

            <button
              onClick={createProject}
              className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500"
            >
              作成
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">プロジェクト</h2>

          {loading ? (
            <p className="text-slate-400">読み込み中...</p>
          ) : projects.length === 0 ? (
            <p className="text-slate-400">
              まだプロジェクトがありません。
            </p>
          ) : (
            <div className="grid gap-4">
        {projects.map((project) => (
  <div
    key={project.id}
    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
  >
<Link href={`/projects/${project.id}`}>
  <h3 className="text-lg font-bold">{project.name}</h3>

      <p className="text-sm text-slate-400">
        作成日: {new Date(project.created_at).toLocaleString()}
      </p>
    </Link>

    <button
      onClick={() => deleteProject(project.id)}
      className="rounded-lg border border-red-500 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
    >
      プロジェクト削除
    </button>
  </div>
))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}