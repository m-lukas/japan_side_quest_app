export function Icon({ name, size = 22, ...props }) {
  const paths = {
    torii: <><path d="M3 5q9 3 18 0M4 9h16M7 8v13m10-13v13M6 14h12"/><path d="M5 5v4m14-4v4"/></>,
    bamboo: <><path d="M9 22 10 3m5 19L14 2M8 9h4m1-3h3m-8 9h4m1-3h4"/><path d="M10 7Q3 6 3 2q6 0 7 5ZM15 11q6-6 7-2-2 4-7 2ZM9 18q-6-1-6-5 5 0 6 5Z"/></>,
    card: <><rect x="6" y="3" width="14" height="18" rx="3"/><path d="m4 7-2 12q0 2 2 2m9-13 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/></>,
    map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16m6-14v16"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    check: <path d="m5 12 4 4L20 5"/>,
    swap: <><path d="M4 8h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></>,
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></>,
    location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.card}</svg>;
}

export function Capsule({ points, small = false }) {
  return <span className={`capsule ${small ? 'capsule-small' : ''}`} role="img" aria-label={`${points} Punkte`}>
    <span className="capsule-claw" aria-hidden="true"><svg viewBox="0 0 60 32"><path d="M30 0v9M20 9h20M20 9l-9 14 6 7m23-21 9 14-6 7M30 9v12"/></svg></span>
    <span className="capsule-orb" aria-hidden="true"><span className="capsule-prize"/><span className="capsule-number">{points}</span></span>
  </span>;
}
export function Backdrop() {
  return <div className="backdrop-art" aria-hidden="true"><div className="halo halo-one"/><div className="halo halo-two"/><div className="bamboo bamboo-left"><Icon name="bamboo" size={160}/></div><div className="bamboo bamboo-right"><Icon name="bamboo" size={180}/></div><div className="torii-art"><Icon name="torii" size={160}/></div></div>;
}
