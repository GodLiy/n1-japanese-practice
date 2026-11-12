# 聴話

面向已经通过 JLPT N1 的学习者，把时间用在听力和口语上。界面是简体中文，内容是 N1 及以后的新闻、评论、会议、学术短讲、访谈、投诉和交涉。

不需要账号，不需要服务器。进度、分数和设置只写在这台浏览器的 `localStorage` 里。打开链接就能用。

稿子都是为这套练习写的，不是 JLPT 真题，也不是哪家媒体、教材或付费课程的原文。

## 能做什么

- **听解**：朗读独白和对话，问要旨、细节、态度和言外之意。答完再看原文、词和中文解释。可以慢速重听。
- **跟读**：按小段跟口语。缩约、填充词、敬语的节拍会单独标出来，并给出书面说法作对照。
- **应对**：会议、投诉、交涉、正式和随意的拒绝。说完后按要点重合打分，并给出参考答案、变体和语体说明。
- **朗读**：句一级的语调、对比重音、长定语和引用。分数只核对字面，音高要自己对照播放来听。

阅读、单词和语法只出现在听完或说完之后，没有单独的背词或语法课。

## 本地运行

需要 Node.js 22。

```bash
npm install
npm run dev
```

开发服务器是 [http://127.0.0.1:4317](http://127.0.0.1:4317)。`localhost` 算安全连接，可以使用麦克风。

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4318
```

不要用浏览器直接打开 `dist/index.html`。那种地址不是 HTTPS，语音识别不会工作。

## 发布到 GitHub Pages

仓库需要是 **公开的 GitHub 仓库**，Pages 才能对所有人打开。这个项目如果还停在 Cursor 的 Origin 草稿里，要先在 GitHub 上建成公开仓库，再打开 Pages。

1. 把 `main` 推到公开仓库。
2. 打开仓库的 Settings → Pages。
3. Build and deployment 选 **GitHub Actions**。
4. `.github/workflows/pages.yml` 会在推送到 `main` 时构建并部署。也可以手动运行 “Deploy GitHub Pages”。
5. 部署完成后，地址一般是 `https://<用户名>.github.io/<仓库名>/`。

应用使用哈希路由，并在构建时把 `index.html` 复制成 `404.html`。分享链接长这样：

```text
https://<用户名>.github.io/<仓库名>/#/listen/L01
```

`vite.config.ts` 里是 `base: './'`，所以无论站点在域名根目录还是 `/仓库名/` 下，资源路径都不用改。如果默认分支不是 `main`，把 workflow 里的分支名改成你的默认分支。

## 麦克风和浏览器

- 识别用 Web Speech API，语言 `ja-JP`。Chrome 和 Edge 最合适。Safari 对朗读的支持较好，识别不稳定。Firefox 通常没有语音识别。
- 麦克风只在安全连接里可用：本机开发地址，或 GitHub Pages 的 HTTPS。
- 这个网站没有后端，不保存录音，也不把音频传到自己的服务器。Chrome 的识别可能由浏览器厂商的服务完成，这是 API 本身的行为。
- 识别结果会显示出来，可以改掉明显的误转换再评分。浏览器不能识别时，可以把话打进去对照。
- 朗读优先选用本机日语语音。没有日语语音时会用浏览器默认语音，声调可能不准。识别不能给句调打分。

## 再加一篇

内容在 `src/content/`：

- `listening.ts` 听解
- `shadowing.ts` 跟读
- `roleplay.ts` 应对
- `readaloud.ts` 朗读

日语里需要注音的词写成 `[[汉字|よみ]]`。页面上的假名开关只显示这些读音。

## 目录

```text
src/content     练习稿
src/pages       页面
src/lib         评分、注音、本地存储
src/speech.tsx  朗读
```
