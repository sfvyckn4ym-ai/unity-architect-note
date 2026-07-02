using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;
using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;

public class UnityArchitectNoteWindow : EditorWindow
{

    private const string PrefKeySupabaseUrl = "UnityArchitectNote.SupabaseUrl";
    private const string PrefKeyAnonKey = "UnityArchitectNote.AnonKey";
    private const string PrefKeyEmail = "UnityArchitectNote.Email";
    private const string PrefKeyProjectId = "UnityArchitectNote.ProjectId";
    private const string PrefKeyScriptsFolder = "UnityArchitectNote.ScriptsFolder";
    private string supabaseUrl = "https://あなたのSupabaseURL.supabase.co";
    private string anonKey = "あなたのNEXT_PUBLIC_SUPABASE_ANON_KEY";
    private string email = "";
    private string password = "";
    private string projectId = "";
    private string scriptsFolder = "Assets/Scripts";

    private string accessToken = "";
    private Vector2 scrollPosition;

    [MenuItem("Tools/Unity Architect Note")]
    public static void ShowWindow()
    {
        GetWindow<UnityArchitectNoteWindow>("Architect Note");
    }

    private void OnEnable()
    {
        LoadSettings();
    }

    private void OnGUI()
    {
        scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);

        GUILayout.Label("Unity Architect Note Sync", EditorStyles.boldLabel);

        EditorGUILayout.Space();

        supabaseUrl = EditorGUILayout.TextField("Supabase URL", supabaseUrl);
        anonKey = EditorGUILayout.TextField("Anon / Publishable Key", anonKey);

        EditorGUILayout.Space();

        email = EditorGUILayout.TextField("Email", email);
        password = EditorGUILayout.PasswordField("Password", password);

        if (GUILayout.Button("Login to Supabase"))
        {
            _ = LoginAsync();
        }

        if (!string.IsNullOrEmpty(accessToken))
        {
            EditorGUILayout.HelpBox("ログイン済み", MessageType.Info);
        }
        else
        {
            EditorGUILayout.HelpBox("未ログインです。先にログインしてください。", MessageType.Warning);
        }

        EditorGUILayout.Space();

        projectId = EditorGUILayout.TextField("Project ID", projectId);
scriptsFolder = EditorGUILayout.TextField("Scripts Folder", scriptsFolder);

EditorGUILayout.Space();

EditorGUILayout.BeginHorizontal();

if (GUILayout.Button("Save Settings"))
{
    SaveSettings();
}

if (GUILayout.Button("Clear Settings"))
{
    ClearSettings();
}

EditorGUILayout.EndHorizontal();

EditorGUILayout.Space();

        if (GUILayout.Button("Upload C# Scripts to Supabase"))
        {
            _ = UploadScriptsAsync();
        }

        if (GUILayout.Button("Download & Apply Scripts from Supabase"))
        {
            if (EditorUtility.DisplayDialog(
                "確認",
                "Supabase上のコードでローカルの.csファイルを上書きします。バックアップは作成されます。続行しますか？",
                "実行",
                "キャンセル"
            ))
            {
                _ = DownloadAndApplyScriptsAsync();
            }
        }

        EditorGUILayout.Space();

        EditorGUILayout.HelpBox(
            "使い方:\n" +
            "1. Webアプリと同じメール・パスワードでログイン\n" +
            "2. Supabaseのprojectsテーブルから対象projectIdをコピー\n" +
            "3. UploadでUnity内の.csをクラウドへ送信\n" +
            "4. Web/スマホで編集\n" +
            "5. Download & ApplyでUnityへ反映",
            MessageType.None
        );

        EditorGUILayout.EndScrollView();
    }

    private async Task LoginAsync()
    {
        if (string.IsNullOrWhiteSpace(supabaseUrl) ||
            string.IsNullOrWhiteSpace(anonKey) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            Debug.LogError("Supabase URL / Key / Email / Password を入力してください。");
            return;
        }

        string url = $"{supabaseUrl}/auth/v1/token?grant_type=password";

        string json = "{"
            + $"\"email\":\"{EscapeJson(email)}\","
            + $"\"password\":\"{EscapeJson(password)}\""
            + "}";

        using UnityWebRequest request = new UnityWebRequest(url, "POST");

        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();

        request.SetRequestHeader("apikey", anonKey);
        request.SetRequestHeader("Content-Type", "application/json");

        await SendRequestAsync(request);

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError($"Login failed: {request.responseCode} {request.error}\n{request.downloadHandler.text}");
            return;
        }

        AuthResponse auth = JsonUtility.FromJson<AuthResponse>(request.downloadHandler.text);
        accessToken = auth.access_token;

        if (string.IsNullOrEmpty(accessToken))
        {
            Debug.LogError("access_tokenを取得できませんでした。レスポンス: " + request.downloadHandler.text);
            return;
        }
        SaveSettings();
        Debug.Log("Supabase login success.");
    }

    private async Task UploadScriptsAsync()
    {
        if (!ValidateReady()) return;

        if (!Directory.Exists(scriptsFolder))
        {
            Debug.LogError($"フォルダが見つかりません: {scriptsFolder}");
            return;
        }

        string[] files = Directory.GetFiles(scriptsFolder, "*.cs", SearchOption.AllDirectories);

        if (files.Length == 0)
        {
            Debug.LogWarning(".csファイルが見つかりませんでした。");
            return;
        }

        int successCount = 0;

        foreach (string filePath in files)
        {
            string unityPath = filePath.Replace("\\", "/");
            string fileName = Path.GetFileName(filePath);
            string content = File.ReadAllText(filePath, Encoding.UTF8);

            bool success = await UpsertCodeFileAsync(unityPath, fileName, content);

            if (success)
            {
                successCount++;
            }
        }

        Debug.Log($"Upload complete. {successCount}/{files.Length} files uploaded.");
    }

    private async Task<bool> UpsertCodeFileAsync(string unityPath, string fileName, string content)
    {
        string url = $"{supabaseUrl}/rest/v1/code_files?on_conflict=project_id,unity_path";

        string json = "{"
            + $"\"project_id\":\"{EscapeJson(projectId)}\","
            + $"\"unity_path\":\"{EscapeJson(unityPath)}\","
            + $"\"file_name\":\"{EscapeJson(fileName)}\","
            + $"\"content\":\"{EscapeJson(content)}\","
            + $"\"last_synced_from\":\"unity\","
            + $"\"updated_at\":\"{DateTime.UtcNow:O}\""
            + "}";

        using UnityWebRequest request = new UnityWebRequest(url, "POST");

        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();

        SetSupabaseHeaders(request);
        request.SetRequestHeader("Prefer", "resolution=merge-duplicates,return=representation");

        await SendRequestAsync(request);

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError($"Upload failed: {unityPath}\n{request.responseCode} {request.error}\n{request.downloadHandler.text}");
            return false;
        }

        Debug.Log($"Uploaded: {unityPath}");
        return true;
    }

   private async Task DownloadAndApplyScriptsAsync()
{
    if (!ValidateReady()) return;

    string url =
        $"{supabaseUrl}/rest/v1/code_files" +
        $"?project_id=eq.{UnityWebRequest.EscapeURL(projectId)}" +
        "&select=id,unity_path,file_name,content,updated_at";

    using UnityWebRequest request = UnityWebRequest.Get(url);
    SetSupabaseHeaders(request);

    await SendRequestAsync(request);

    if (request.result != UnityWebRequest.Result.Success)
    {
        Debug.LogError($"Download failed: {request.responseCode} {request.error}\n{request.downloadHandler.text}");
        return;
    }

    string wrappedJson = "{ \"items\": " + request.downloadHandler.text + " }";
    CodeFileList list = JsonUtility.FromJson<CodeFileList>(wrappedJson);

    if (list == null || list.items == null || list.items.Length == 0)
    {
        Debug.LogWarning("Supabase上にコードファイルがありません。");
        return;
    }

    // Assets の外にバックアップを作る
    string backupRoot = $"UnityArchitectNoteBackups/{DateTime.Now:yyyyMMdd_HHmmss}";
    Directory.CreateDirectory(backupRoot);

    int appliedCount = 0;

    foreach (CodeFileDto file in list.items)
    {
        string path = file.unity_path;

        if (string.IsNullOrWhiteSpace(path) || !path.EndsWith(".cs"))
        {
            Debug.LogWarning($"Invalid path skipped: {path}");
            continue;
        }

        string directory = Path.GetDirectoryName(path);

        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        // 既存ファイルがある場合だけバックアップ
        if (File.Exists(path))
        {
            string backupFileName = path.Replace("/", "_").Replace("\\", "_") + ".bak";
            string backupPath = Path.Combine(backupRoot, backupFileName);

            File.Copy(path, backupPath, true);
        }

        // Supabase上の内容でローカルファイルを更新
        File.WriteAllText(path, file.content ?? "", Encoding.UTF8);
        appliedCount++;

        Debug.Log($"Applied: {path}");
    }

    AssetDatabase.Refresh();

    Debug.Log($"Download & Apply complete. {appliedCount} files applied. Backup: {backupRoot}");
}

    private void LoadSettings()
    {
     supabaseUrl = EditorPrefs.GetString(
        PrefKeySupabaseUrl,
        "https://あなたのSupabaseURL.supabase.co"
    );

     anonKey = EditorPrefs.GetString(
        PrefKeyAnonKey,
        "あなたのNEXT_PUBLIC_SUPABASE_ANON_KEY"
    );

    email = EditorPrefs.GetString(PrefKeyEmail, "");
    projectId = EditorPrefs.GetString(PrefKeyProjectId, "");
    scriptsFolder = EditorPrefs.GetString(PrefKeyScriptsFolder, "Assets/Scripts");
    }   

    private void SaveSettings()
{
    EditorPrefs.SetString(PrefKeySupabaseUrl, supabaseUrl);
    EditorPrefs.SetString(PrefKeyAnonKey, anonKey);
    EditorPrefs.SetString(PrefKeyEmail, email);
    EditorPrefs.SetString(PrefKeyProjectId, projectId);
    EditorPrefs.SetString(PrefKeyScriptsFolder, scriptsFolder);

    Debug.Log("Unity Architect Note settings saved.");
}

private void ClearSettings()
{
    EditorPrefs.DeleteKey(PrefKeySupabaseUrl);
    EditorPrefs.DeleteKey(PrefKeyAnonKey);
    EditorPrefs.DeleteKey(PrefKeyEmail);
    EditorPrefs.DeleteKey(PrefKeyProjectId);
    EditorPrefs.DeleteKey(PrefKeyScriptsFolder);

    supabaseUrl = "https://あなたのSupabaseURL.supabase.co";
    anonKey = "あなたのNEXT_PUBLIC_SUPABASE_ANON_KEY";
    email = "";
    password = "";
    projectId = "";
    scriptsFolder = "Assets/Scripts";
    accessToken = "";

    Debug.Log("Unity Architect Note settings cleared.");
}

    private bool ValidateReady()
    {
        if (string.IsNullOrWhiteSpace(supabaseUrl) ||
            string.IsNullOrWhiteSpace(anonKey) ||
            string.IsNullOrWhiteSpace(projectId))
        {
            Debug.LogError("Supabase URL / Key / Project ID を入力してください。");
            return false;
        }

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            Debug.LogError("先に Login to Supabase を実行してください。");
            return false;
        }

        return true;
    }

    private void SetSupabaseHeaders(UnityWebRequest request)
    {
        request.SetRequestHeader("apikey", anonKey);
        request.SetRequestHeader("Authorization", $"Bearer {accessToken}");
        request.SetRequestHeader("Content-Type", "application/json");
    }

    private async Task SendRequestAsync(UnityWebRequest request)
    {
        UnityWebRequestAsyncOperation operation = request.SendWebRequest();

        while (!operation.isDone)
        {
            await Task.Delay(50);
        }
    }

    private static string EscapeJson(string value)
    {
        if (value == null) return "";

        return value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }

    [Serializable]
    private class AuthResponse
    {
        public string access_token;
        public string token_type;
        public int expires_in;
        public string refresh_token;
    }

    [Serializable]
    private class CodeFileDto
    {
        public string id;
        public string unity_path;
        public string file_name;
        public string content;
        public string updated_at;
    }

    [Serializable]
    private class CodeFileList
    {
        public CodeFileDto[] items;
    }
}