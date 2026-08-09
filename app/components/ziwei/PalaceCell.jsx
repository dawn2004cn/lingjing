'use client'

const SIHUA_CLASS = {
  禄: 'ziwei-sihua-lu',
  权: 'ziwei-sihua-quan',
  科: 'ziwei-sihua-ke',
  忌: 'ziwei-sihua-ji',
}

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

export default function PalaceCell({
  palace,
  isSelected,
  isSanFang,
  isFocusDaXian,
  isLiuNianMing,
  liuNianStarMap,
  onClick,
}) {
  if (!palace) return null

  const majors = palace.stars.filter((s) => s.type === 'major')
  const others = palace.stars.filter((s) => s.type !== 'major')
  const stem = STEMS[palace.stem] || ''
  const branch = BRANCHES[palace.branch] || ''
  const flowMap = liuNianStarMap || {}

  return (
    <button
      type="button"
      className={[
        'ziwei-palace',
        isSelected ? 'is-selected' : '',
        isSanFang ? 'is-sanfang' : '',
        palace.isMingGong ? 'is-ming' : '',
        palace.isCurrentDaXian || isFocusDaXian ? 'is-daxian' : '',
        isFocusDaXian ? 'is-focus-dx' : '',
        isLiuNianMing ? 'is-liunian' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="ziwei-palace-head">
        <span className="ziwei-palace-name">
          {palace.name}
          {palace.isMingGong && <em>命</em>}
          {palace.isShenGong && <em>身</em>}
          {isFocusDaXian && <em className="tag-dx">限</em>}
          {isLiuNianMing && <em className="tag-ln">年</em>}
        </span>
        <span className="ziwei-palace-gz">{stem}{branch}</span>
      </div>

      <div className="ziwei-palace-majors">
        {majors.length === 0 ? (
          <span className="ziwei-empty">空</span>
        ) : (
          majors.map((s) => (
            <span key={s.name} className="ziwei-star major">
              {s.name}
              {s.siHua && (
                <i className={SIHUA_CLASS[s.siHua] || ''}>{s.siHua}</i>
              )}
              {flowMap[s.name] && (
                <i className={`ziwei-flow ${SIHUA_CLASS[flowMap[s.name]] || ''}`}>
                  流{flowMap[s.name]}
                </i>
              )}
            </span>
          ))
        )}
      </div>

      <div className="ziwei-palace-minors">
        {others.slice(0, 8).map((s) => (
          <span key={s.name} className={`ziwei-star ${s.type}`}>
            {s.name}
            {s.siHua && (
              <i className={SIHUA_CLASS[s.siHua] || ''}>{s.siHua}</i>
            )}
            {flowMap[s.name] && (
              <i className={`ziwei-flow ${SIHUA_CLASS[flowMap[s.name]] || ''}`}>
                流{flowMap[s.name]}
              </i>
            )}
          </span>
        ))}
      </div>

      {palace.daXianAge && (
        <div className="ziwei-palace-age">
          {palace.daXianAge[0]}–{palace.daXianAge[1]}岁
        </div>
      )}
    </button>
  )
}
