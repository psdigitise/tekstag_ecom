import useScrollAnimation from '../hooks/useScrollAnimation'

/**
 * Wraps children in a scroll-triggered fade+slide animation.
 * @param {string} direction - 'up' | 'left' | 'right' | 'scale'
 * @param {number} delay - ms delay
 * @param {number} distance - px to travel (default 32)
 */
export default function AnimatedSection({
  children,
  direction = 'up',
  delay = 0,
  distance = 32,
  className = '',
  threshold = 0.12,
}) {
  const [ref, isVisible] = useScrollAnimation(threshold)

  const getInitialTransform = () => {
    switch (direction) {
      case 'up':    return `translateY(${distance}px)`
      case 'down':  return `translateY(-${distance}px)`
      case 'left':  return `translateX(${distance}px)`
      case 'right': return `translateX(-${distance}px)`
      case 'scale': return `scale(0.94)`
      default:      return `translateY(${distance}px)`
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : getInitialTransform(),
        transition: `opacity 0.72s cubic-bezier(0.22,1,0.36,1) ${delay}ms,
                     transform 0.72s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
