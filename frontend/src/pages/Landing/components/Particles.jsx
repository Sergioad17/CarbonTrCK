export default function Particles() {
  const ps = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    l: `${Math.random() * 100}%`,
    dur: `${16 + Math.random() * 18}s`,
    del: `${Math.random() * 10}s`,
    sz: 8 + Math.random() * 9,
    op: 0.18 + Math.random() * 0.22,
  }));

  return (
    <div className="lnd-p">
      {ps.map((p) => (
        <div
          key={p.id}
          className="lnd-pd"
          style={{
            left: p.l,
            width: p.sz,
            height: p.sz,
            opacity: p.op,
            "--dur": p.dur,
            animationDelay: p.del,
          }}
        />
      ))}
    </div>
  );
}
