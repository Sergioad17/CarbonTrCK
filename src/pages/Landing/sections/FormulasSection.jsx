import { R } from "../components/Reveal";

export default function FormulasSection() {
  return (
    <section id="formulas" className="lnd-sec">
      <div className="lnd-c">
      <R><div className="lnd-sl">Cálculos</div></R>
      <R><h2 className="lnd-st">Cálculos transparentes (sin caja negra)</h2></R>
      <R><p className="lnd-ss">Enfoque estándar: dato de actividad × factor de emisión = CO₂ equivalente.</p></R>
      <R>
        <div className="lnd-fb">
          <div className="lnd-fbc">
            <h4>Emisiones por registro</h4>
            <code>CO₂e = AD × EF</code>
            <span className="dm">AD = Dato de actividad (kWh, L, kg, km)</span><br />
            <span className="dm">EF = Factor de emisión (kgCO₂e/unidad)</span>
          </div>

          <div className="lnd-fbc">
            <h4>Electricidad (Scope 2)</h4>
            <code>CO₂e(kg) = kWh × 0.435</code>
            <span className="dm">Factor SEMARNAT 2024: 0.435 kgCO₂e/kWh</span>
          </div>

          <div className="lnd-fbc">
            <h4>Combustible (Scope 1)</h4>
            <code>CO₂e(kg) = Litros × 2.68</code>
            <span className="dm">Factor INECC 2023: 2.68 kgCO₂e/L (diésel)</span>
          </div>

          <div className="lnd-fbc">
            <h4>Conversión</h4>
            <code>tCO₂e = CO₂e(kg) / 1000</code>
            <span className="dm">Cada resultado conserva factor, fuente y fecha para auditoría</span>
          </div>
        </div>
      </R>
      </div>
    </section>
  );
}
