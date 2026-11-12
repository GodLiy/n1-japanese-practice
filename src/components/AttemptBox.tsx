import type { InputMode } from '../lib/useRecognizer.ts'

export function AttemptBox({
  listening,
  text,
  error,
  supported,
  canRecord = false,
  secure,
  inputMode = 'type',
  audioUrl = null,
  onChange,
  onMic,
}: {
  listening: boolean
  text: string
  error: string | null
  supported: boolean
  canRecord?: boolean
  secure: boolean
  inputMode?: InputMode
  audioUrl?: string | null
  onChange: (value: string) => void
  onMic: () => void
}) {
  const status = listening
    ? inputMode === 'record'
      ? '正在录音。说完再点一次，然后可以回听。'
      : '正在听日语。说完再点一次。'
    : inputMode === 'speech'
      ? '点麦克风，用日语说。识别结果可以改，也可以回听刚才的录音。'
      : inputMode === 'record'
        ? '点麦克风录音。这台浏览器不能自动转成文字，可以说完回听，再把句子打出来。'
        : '这台浏览器不能识别，也不能录音。把你说的话打在下面。'

  const placeholder = inputMode === 'speech'
    ? '这里会出现日语。明显的误转换可以直接改，再看分数。'
    : '把你说的日语打在这里，再评分。'

  return (
    <div className="attempt">
      <div className="attempt-row">
        <button type="button" className={listening ? 'mic mic-live' : 'mic'} onClick={onMic} aria-pressed={listening}>
          <span className="mic-kana">{listening ? '停止' : '話す'}</span>
          <span className="mic-zh">{listening ? '停止' : '说话'}</span>
        </button>
        <div className="attempt-copy">
          <p className="attempt-status" aria-live="polite">{status}</p>
          {!secure ? <p className="form-error">当前不是安全连接，麦克风不可用。</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </div>
      {audioUrl ? (
        <div className="replay">
          <p className="fine">听自己刚才说的日语。这段录音只留在这台设备上。</p>
          <audio controls preload="auto" src={audioUrl} />
        </div>
      ) : null}
      <label className="field">
        <span>{supported ? '识别结果' : canRecord ? '自己写下刚才说的话' : '手写对照'}</span>
        <textarea
          lang="ja"
          className="jp"
          value={text}
          readOnly={listening}
          spellCheck={false}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <p className="fine">声音不会上传到这个网站，也不会写进练习记录。若浏览器提供识别，可能由浏览器自己的服务处理，这不是本站在接收录音。</p>
    </div>
  )
}
