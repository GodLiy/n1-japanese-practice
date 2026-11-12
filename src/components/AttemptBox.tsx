export function AttemptBox({
  listening,
  text,
  error,
  supported,
  secure,
  onChange,
  onMic,
}: {
  listening: boolean
  text: string
  error: string | null
  supported: boolean
  secure: boolean
  onChange: (value: string) => void
  onMic: () => void
}) {
  return (
    <div className="attempt">
      <div className="attempt-row">
        <button
          type="button"
          className={listening ? 'mic mic-live' : 'mic'}
          onClick={onMic}
          aria-pressed={listening}
          disabled={!secure && supported}
        >
          <span className="mic-kana">{listening ? '停止' : '話す'}</span>
          <span className="mic-zh">{listening ? '停止' : '说话'}</span>
        </button>
        <div className="attempt-copy">
          <p className="attempt-status" aria-live="polite">
            {listening ? '正在听日语。说完再点一次。' : supported ? '点麦克风，用日语说。识别结果可以改。' : '这个浏览器不能识别，把你说的话打在下面。'}
          </p>
          {!secure ? <p className="form-error">当前不是安全连接，麦克风不可用。请用本机开发地址或 HTTPS。</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </div>
      <label className="field">
        <span>{supported ? '识别结果' : '手写对照'}</span>
        <textarea
          lang="ja"
          className="jp"
          value={text}
          readOnly={listening}
          spellCheck={false}
          autoComplete="off"
          placeholder={supported ? '这里会出现日语。明显的误转换可以直接改，再看分数。' : '这个浏览器没有语音识别。把句子打在这里再评分。'}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <p className="fine">声音不会上传到这个网站，也不会写进练习记录。Chrome 的识别可能由浏览器自己的服务完成。</p>
    </div>
  )
}
