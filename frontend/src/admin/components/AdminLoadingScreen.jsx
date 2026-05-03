import React from "react";

export default function AdminLoadingScreen() {
  return (
    <div className="loader-container">
      <style>{`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100%;
        }

        .fading-bars {
          display: flex;
          justify-content: space-between;
          width: 80px;
        }

        .fading-bars .bar {
          width: 10px;
          height: 40px;
          background-color: #FF5C35;
          animation: admin-loader-fade 1s infinite;
        }

        .fading-bars .bar:nth-child(1) { animation-delay: 0s; }
        .fading-bars .bar:nth-child(2) { animation-delay: 0.2s; }
        .fading-bars .bar:nth-child(3) { animation-delay: 0.4s; }
        .fading-bars .bar:nth-child(4) { animation-delay: 0.6s; }
        .fading-bars .bar:nth-child(5) { animation-delay: 0.8s; }

        @keyframes admin-loader-fade {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="fading-bars">
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
      </div>
    </div>
  );
}
