"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signUp = async () => {
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("新規登録しました。ログインしてください。");
  };

  const signIn = async () => {
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください。");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/projects");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-blue-400 font-semibold">
            Unity Architect Note
          </p>

          <h1 className="text-3xl font-bold">ログイン</h1>

          <p className="text-sm text-slate-400">
            メールアドレスとパスワードでログインします。
          </p>
        </div>

        <div className="space-y-4">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={signIn}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500"
          >
            ログイン
          </button>

          <button
            onClick={signUp}
            className="w-full rounded-lg border border-slate-700 px-4 py-3 font-bold text-white hover:bg-slate-800"
          >
            新規登録
          </button>
        </div>
      </div>
    </main>
  );
}