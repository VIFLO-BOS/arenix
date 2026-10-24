/**
 * Route entrance for marketing pages. A template remounts on every navigation, so a CSS
 * keyframe replays a slow fade and lift without turning the whole page into a hydrated client
 * subtree (which would break inline JSON-LD script hydration). Reduced motion disables it via
 * the global media query.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
