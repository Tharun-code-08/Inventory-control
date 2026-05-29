import { useEffect, useState } from 'react';

const MOBILE_MOTION_QUERY = '(max-width: 767px), (pointer: coarse)';

/** True when heavy marketing motion (parallax, etc.) should be disabled. */
export function useIsMobileMotion(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_MOTION_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MOTION_QUERY);
    const onChange = (event: MediaQueryListEvent) => setMobile(event.matches);
    setMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return mobile;
}
