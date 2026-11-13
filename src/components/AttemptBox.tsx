import { Link } from 'react-router'
import { isBaidu } from '../lib/device.ts'
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
  level = 0,
  heard = false,
  asrStatus = null,
  onChange,
  onMic,
  onCancelAsr,
}: {
  listening: boolean
  text: string
  error: string | null
  supported: boolean
  canRecord?: boolean
  secure: boolean
  inputMode?: InputMode
  audioUrl?: string | null
  level?: number
  heard?: boolean
  asrStatus?: string | null
  onChange: (value: string) => void
  onMic: () => void
  onCancelAsr?: () => void
}) {
  const status = asrStatus
    ? asrStatus
    : listening
      ? heard || level >= 0.08
        ? '正在听到声音。说完再点一次。'
        : '麦克风已打开，还没有听到声音。请靠近一点。'
      : inputMode === 'speech'
        ? '点麦克风，用日语说。能听到声音时，音量条会动。识别结果可以改。'
        : inputMode === 'record'
          ? '点麦克风录音。浏览器不能直接识别时，会用本机模型把录音转成文字。'
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
          {isBaidu() && !listening ? <p className="fine">手机百度里会直接录音。点了允许后，音量条应该会动；不动就到系统设置打开百度的麦克风。</p> : null}
          {listening ? (
            <div className="level" aria-hidden="true">
              <span style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          ) : null}
          {asrStatus && !listening && onCancelAsr ? (
            <div className="attempt-row">
              <button type="button" className="text-btn" onClick={onCancelAsr}>取消</button>
              <button type="button" className="text-btn" onClick={onMic}>再试</button>
            </div>
          ) : null}
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
      <p className="fine">
        声音不会上传，也不会写进练习记录。麦克风权限和本机识别在 <Link to="/settings">设置</Link> 里。浏览器若提供识别，可能由浏览器自己的服务处理。
      </p>
    </div>
  )
}
