import { useEffect, useRef } from "react";

function useRv() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([e]) => {
        el.classList.toggle("v", e.isIntersecting);
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}

export function R({ children, cl = "" }) {
  const ref = useRv();
  return (
    <div ref={ref} className={`rv ${cl}`}>
      {children}
    </div>
  );
}
