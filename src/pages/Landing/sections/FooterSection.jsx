import LeafIcon from "../components/LeafIcon";

export default function FooterSection() {
  return (
    <footer className="lnd-ft">
      <div className="lnd-c">
        <div className="lnd-ftg">
          <div>
            <div className="lnd-ftb">
              <LeafIcon s={22} />
              CarbonTrack
            </div>
            <p className="lnd-ftd">
              Medición y gestión de huella de carbono para instituciones educativas. Trazabilidad completa, scopes y metas.
            </p>
          </div>

          <div className="lnd-ftc">
            <h4>Producto</h4>
            <a href="#features">Dashboard</a>
            <a href="#features">Emisiones</a>
            <a href="#features">Scopes</a>
            <a href="#features">Áreas</a>
            <a href="#features">Metas</a>
          </div>

          <div className="lnd-ftc">
            <h4>Recursos</h4>
            <a href="#">Documentación</a>
            <a href="#">Soporte</a>
            <a href="#">Contacto</a>
          </div>

          <div className="lnd-ftc">
            <h4>Legal</h4>
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
          </div>
        </div>

        <p className="lnd-fcp">© 2026 CarbonTrack - Instituto Tecnológico Superior de El Mante</p>
      </div>
    </footer>
  );
}
