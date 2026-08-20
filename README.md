# iPAS 刷題 — AI 應用規劃師考古題

針對經濟部 iPAS「AI 應用規劃師」能力鑑定公告試題整理的靜態刷題網頁。資料與網頁同源，可直接部署至 GitHub Pages。

## 題庫內容

| 等級 | 梯次 | 科目 | 題數 |
|------|------|------|------|
| 初級 | 114-2 | 科目1 | 50 |
| 初級 | 114-2 | 科目2 | 50 |
| 初級 | 115-1 | 科目1 | 50 |
| 初級 | 115-1 | 科目2 | 50 |
| 初級 | 115-2 | 科目1 | 50 |
| 中級 | 114-2 | 科目1 | 50 |
| 中級 | 114-2 | 科目2 | 50 |
| 中級 | 114-2 | 科目3 | 50 |
| 中級 | 115-1 | 科目1 | 50 |
| 中級 | 115-1 | 科目2 | 50 |
| 中級 | 115-1 | 科目3 | 50 |

共 **600 題**（含圖片題，圖片存於 `assets/`）。

一次篩選單一「等級＋科目」內的多個梯次練習；下載習題數另有 115-2 初級科目2，屬「下載」題型（非公告試題），暫未納入。

## 本地預覽

```powershell
cd 考古題json
python -m http.server 8000
```

瀏覽器開啟 <http://localhost:8000/>。

> 直接雙擊 `index.html`（file://）也能使用：題庫已內嵌於 `js\bank.js`（`window.IPAS_BANK`），頁面會優先讀取；若無 `bank.js` 才嘗試 fetch `questions.json`。兩種資料來源須保持同步（均由 `convert_ipas_pdf.py` 產生）。

## 部署至 GitHub Pages（公開 repo）

### 1. 安裝並登入 GitHub CLI
```powershell
winget install --id GitHub.cli --accept-source-agreements --accept-package-agreements
gh auth login        # 選 GitHub.com → HTTPS → 瀏覽器登入（或貼 Personal Access Token）
```
若 winget/MSI 因舊的 msiexec 卡在 1618，可改用 zip 版解壓到資料夾並加進 PATH（見下方）。PATH 更新後請開**新終端機**讓 `gh` 生效。

> 免安裝 zip 版：下載 `gh_<版本>_windows_amd64.zip` 解壓到 `%LOCALAPPDATA%\Programs\GitHubCLI`，並把其中的 `bin` 資料夾加入使用者 PATH（[環境變數] 或 `[Environment]::SetEnvironmentVariable('Path', ..., 'User')`）。

### 2. 建立 repo 並推送
```powershell
cd 考古題json
git init
git add -A
git commit -m "init: iPAS AI 應用規劃師考古題刷題站"
gh repo create ipas-quiz --public --source=. --push
```

### 3. 啟用 GitHub Pages
GitHub 網頁：**Settings → Pages → Build and deployment → Source: Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`。完成後網址為 `https://<你的帳號>.github.io/ipas-quiz/`。

## 增加新梯次考古題

題庫由 `..\convert_ipas_pdf.py` 從官方公告 PDF 產生。流程：

1. 將新 PDF 放入 `..\考古題pdf\`
2. 執行轉換腳本（會重新產生 `questions.json`、`js\bank.js`、`assets\`）
3. 手動複製並上版（本 repo 即資料夾本身，直接提交即可）：

```bash
git add -A
git commit -m "add: 115-2 初級科目2（若有）"
git push
```

## 考情參考

- 每卷固定 50 題、70 分及格（官方公告）。
- 題目與選項如有「圖片」，會以 `<img>` 顯示（GitHub Pages 需相對路徑，本頁已採用）。

## 資料聲明

- 來源：經濟部產業人才能力鑑定（iPAS）公開之考古題試題，[官方考古題專區](https://www.ipas.org.tw/AI/ExamArchive.aspx)。
- 本專案僅作學習練習用途，版權歸原主辦單位所有。
- 已知限制：
  - 選項本身為純圖者（如 114-2 中級科目3），PDF 文字層無法還原選項文字，僅能顯示圖片。
  - 114-2 中級科目3 第45題之選項文字層含下一頁引言殘文，屬 PDF 原始問題。
  - `explanation`（解析）與 `chapter`（章節）欄位目前皆為空，供日後補齊。