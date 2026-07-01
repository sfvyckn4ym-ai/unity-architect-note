"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type CodeFile = {
  id: string;
  project_id: string;
  unity_path: string;
  file_name: string;
  content: string;
  updated_at: string;
};

export default function CodeEditPage() {
  const params = useParams();

  const projectId = params.projectId as string;
  const codeFileId = params.codeFileId as string;

  const [codeFile, setCodeFile] = useState<CodeFile | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCodeFile = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("code_files")
      .select("*")
      .eq("id", codeFileId)
      .eq("project_id", projectId)
      .single();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setCodeFile(data);
    setContent(data.content);
    setLoading(false);
  };

  const saveCode = async () => {
    if (!codeFile) return;

    setSaving(true);

    const { error } = await supabase
      .from("code_files")
      .update({
        content,
        last_synced_from: "web",
        updated_at: new Date().toISOString(),
      })
      .eq("id", codeFile.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("保存しました。");
    fetchCodeFile();
  };

  useEffect(() => {
    fetchCodeFile();
  }, [projectId, codeFileId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (!codeFile) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">コードファイルが見つかりません。</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-blue-400 hover:underline"
          >
            ← プロジェクト詳細へ戻る
          </Link>

          <div>
            <p className="text-sm text-blue-400 font-semibold">
              Unity Architect Note
            </p>

            <h1 className="text-3xl font-bold">{codeFile.file_name}</h1>

            <p className="mt-2 text-sm text-slate-400">
              {codeFile.unity_path}
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">C#コード編集</h2>

            <button
              onClick={saveCode}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 font-bold hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>

          <textarea
            className="h-[70vh] w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-white outline-none focus:border-blue-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </section>
      </div>
    </main>
  );
}