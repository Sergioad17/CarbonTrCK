const fd = "'Plus Jakarta Sans',sans-serif",
  fb = "'DM Sans',sans-serif",
  fm = "'JetBrains Mono',monospace";

export default function DashMock() {
  const bars = [75, 55, 90, 40, 65, 80, 35];

  return (
    <div style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { t: "Total CO₂e", v: "4.21", u: "tCO₂e", c: "#22C55E" },
          { t: "Scope 1", v: "0.28", u: "tCO₂e", c: "#EAB308" },
          { t: "Scope 2", v: "3.93", u: "tCO₂e", c: "#3B82F6" },
          { t: "Áreas", v: "8", u: "activas", c: "#8B5CF6" },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 120,
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div style={{ fontFamily: fm, fontSize: 11, color: "#64748B", marginBottom: 4 }}>{k.t}</div>
            <div style={{ fontFamily: fm, fontSize: 20, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontFamily: fm, fontSize: 10, color: "#64748B" }}>{k.u}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", gap: 10, minHeight: 0 }}>
        <div
          style={{
            flex: 2,
            borderRadius: 10,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontFamily: fd, fontSize: 12, fontWeight: 700, color: "#F8FAFC", marginBottom: 10 }}>
            Tendencia mensual
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: 1 }}>
            {bars.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: "4px 4px 0 0",
                  background: `linear-gradient(180deg,#22C55E ${100 - h}%,#16A34A 100%)`,
                  opacity: 0.7 + i * 0.04,
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            borderRadius: 10,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              border: "5px solid #22C55E",
              borderTopColor: "#EAB308",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontFamily: fm, fontSize: 15, fontWeight: 700, color: "#F8FAFC" }}>93%</span>
          </div>

          <div style={{ fontFamily: fb, fontSize: 11, color: "#64748B", marginTop: 6 }}>Scope 2</div>
        </div>
      </div>
    </div>
  );
}
