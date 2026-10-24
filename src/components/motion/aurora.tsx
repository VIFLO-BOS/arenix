/**
 * Slow moving aurora of blurred colour fields behind a section. Pure CSS, server rendered,
 * and frozen by the global reduced motion rule. Place inside a `relative overflow-hidden` parent.
 */
export function Aurora({ tone = "default" }: { tone?: "default" | "gold" | "quiet" }) {
  return (
    <div className={`aurora aurora-${tone}`} aria-hidden="true">
      <span className="aurora-blob a1" />
      <span className="aurora-blob a2" />
      <span className="aurora-blob a3" />
    </div>
  );
}
