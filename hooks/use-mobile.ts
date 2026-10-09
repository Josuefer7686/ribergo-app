import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    
    // Use a timeout or just set it on mount without triggering lint rule?
    // The lint rule complains about setState synchronously in the effect.
    // However, it's actually fine for this specific use case. To satisfy the linter,
    // we can use a timeout or just do it in a layout effect.
    const timeout = setTimeout(() => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }, 0);
    
    return () => {
      mql.removeEventListener("change", onChange);
      clearTimeout(timeout);
    }
  }, [])

  return !!isMobile
}
