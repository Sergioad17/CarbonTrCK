import { useEffect, useRef } from "react";

function useRv() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("v");
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 }
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
