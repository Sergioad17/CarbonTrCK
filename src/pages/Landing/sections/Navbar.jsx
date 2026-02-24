import LeafIcon from "../components/LeafIcon";

export default function Navbar({ scrolled, onGo }) {
  return (
    <nav className={`lnd-nav ${scrolled ? "sc" : ""}`}>
      <div className="lnd-ni">
        <div
          className="lnd-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <LeafIcon />
          <span>CarbonTrack</span>
        </div>

        <ul className="lnd-nl">
          <li><a href="#features">Features</a></li>
          <li><a href="#formulas">Cálculos</a></li>
          <li><a href="#process">Proceso</a></li>
          <li><a href="#testimonials">Testimonios</a></li>
        </ul>

        <button className="lnd-nb" onClick={onGo}>
          Ver el producto 
        </button>
      </div>
    </nav>
  );
}
