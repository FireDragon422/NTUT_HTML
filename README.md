# 半導體製程 LLM Wiki

**晶片上的微小結構怎麼做出來？** 以薄膜、微影與蝕刻為主線，供沒有半導體背景的讀者入門。

## 開始閱讀
- 直接開啟 [專案首頁](index.html)，或 [15 頁教學簡報](slides/index.html)。不需網路或安裝套件。
- [可搜尋 Wiki](wiki/index.html) ／ [Markdown Wiki 索引](wiki/README.md)。
- 簡報用左右方向鍵、上一頁／下一頁按鈕或頁面選單切換。Home/End 跳首尾頁。
- 第 9 頁提供膜厚計算，第 14 頁提供自我測驗。「列印全部」會列印所有頁面。
- 第 2、3、4、6、7、8、11、12 頁都有教學配圖，點圖可放大。圖片與生成紀錄保留在 `slides/assets/`，來源與概念對應見 [圖像紀錄](sources/visual-notes.md)。

## 作業交付對照
| 要求 | 成果 |
| --- | --- |
| 先討論後生成 | [需求摘要](workflow/requirements.md)，主題已確認 |
| 至少 ingest 5 篇 | [來源索引](sources/README.md)，3 份講義、2 本書的相關章節選讀 |
| LLM Wiki | [7 個概念條目](wiki/README.md)，16 個可追溯主張 |
| 教學 HTML | [簡報](slides/index.html)，15 頁 |
| AGENTS.md | [專案工作規則](AGENTS.md) |
| Loop / graph | [第二版流程圖、節點契約與執行方式](workflow/controlled-graph.md) |
| 一次實際檢查 | [第二版檢查報告](workflow/v2-check-report.md) ／ [第一版執行紀錄](workflow/run-log.md) |
| 反思 | [反思](workflow/reflection.md) |

這裡的 LLM Wiki 是 LLM 協助整理、以來源與概念連結維護的檔案知識庫，不是已部署的線上 LLM 服務。五份來源不是五個獨立實驗，部分講義引用同一本教科書。

## 維護與重建
成品 HTML 已附在專案內，閱讀不需 Node.js。編輯 Markdown、slides/content.json 或樣式後，可執行：

```text
npm install
npm run build
npm run check
npm run test:browser
```

`build` 使用 marked 轉換 Markdown，保留靜態 HTML。`check` 檢查引用與本機連結。瀏覽檢查需要 Playwright 可用的瀏覽器，可先執行 `npx playwright install chromium`，或用環境變數 `BROWSER_EXECUTABLE` 指定已安裝 Edge／Chrome。這些是維護工具，不會在讀者瀏覽時載入。

## GitHub 準備
已初始化本機 Git，尚未建立遠端或推送。從專案根目錄發布靜態網站即可使用相對連結；GitHub Pages 可選擇對應分支的 `/ (root)`。這只是部署準備，尚未有公開網址。

`raw/` 預設忽略原始教材，`tmp/` 忽略擷取文字、書頁影像、瀏覽器檢查結果與暫存檔。公開內容只有整理後的筆記、來源識別、頁碼及教學成品。尚未指定專案授權條款。
# 第二版流程調整

第二版已執行大綱確認、逐頁稿、獨立初審、一次內容修訂、獨立複審、排版與呈現檢查。第一版內容快照與本輪事件保留在 `workflow/runs/v2-outline/`。

- [第二版 Graph 與 Loop](workflow/controlled-graph.md)
- [十五頁大綱與配圖計畫](workflow/outline-v2.md)
- [本次執行與檢查](workflow/v2-check-report.md)

