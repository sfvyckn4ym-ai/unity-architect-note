export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <p className="text-sm text-blue-400 font-semibold">
            Unity Architect Note
          </p>

          <h1 className="text-4xl md:text-5xl font-bold">
            Unityコードをスマホでも確認・編集
          </h1>

          <p className="text-slate-300 leading-relaxed">
            Unityで作成したC#スクリプトをクラウドに同期し、
            PCやスマートフォンからコード確認・編集・タスク管理を行う
            開発支援Webアプリです。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 transition"
          >
            ログインする
          </a>

          <a
            href="/projects"
            className="rounded-lg border border-slate-600 px-6 py-3 font-semibold hover:bg-slate-800 transition"
          >
            プロジェクトを見る
          </a>
        </div>
      </div>
    </main>
  );
}