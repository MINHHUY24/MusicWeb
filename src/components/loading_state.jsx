import { CircleNotch, MusicNotesSimple, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import '../styles/loading_state.css'

function LoadingState({ title, description, delayMs = 9000, quiet = false, variant = 'loading' }) {
  const Icon = variant === 'error' ? WarningCircle : variant === 'empty' ? MusicNotesSimple : CircleNotch
  const [showDelayedCopy, setShowDelayedCopy] = useState(false)
  const shouldDelayCopy = quiet && variant === 'loading'
  const shouldShowCopy = !shouldDelayCopy || showDelayedCopy

  useEffect(() => {
    if (!shouldDelayCopy) return undefined

    const timer = window.setTimeout(() => {
      setShowDelayedCopy(true)
    }, delayMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [delayMs, shouldDelayCopy])

  return (
    <div
      className={`loading-state loading-state-${variant}`}
      role={variant === 'loading' ? 'status' : 'note'}
      aria-label={shouldShowCopy ? undefined : title}
    >
      <span className="loading-state-icon" aria-hidden="true">
        <Icon size={42} weight={variant === 'loading' ? 'bold' : 'fill'} />
      </span>
      {shouldShowCopy ? <strong>{title}</strong> : null}
      {shouldShowCopy && description ? <span>{description}</span> : null}
    </div>
  )
}

export default LoadingState
