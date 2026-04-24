import { useEffect } from "react";

export function DashboardBackdrop() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let frame = 0;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.2;
    let trailX = targetX;
    let trailY = targetY;

    const render = () => {
      trailX += (targetX - trailX) * 0.12;
      trailY += (targetY - trailY) * 0.12;

      root.style.setProperty("--mouse-x", `${targetX}px`);
      root.style.setProperty("--mouse-y", `${targetY}px`);
      root.style.setProperty("--trail-x", `${trailX}px`);
      root.style.setProperty("--trail-y", `${trailY}px`);
      root.style.setProperty("--dashboard-spotlight-x", `${((trailX / window.innerWidth) * 100).toFixed(2)}%`);
      root.style.setProperty("--dashboard-spotlight-y", `${((trailY / window.innerHeight) * 100).toFixed(2)}%`);

      frame = window.requestAnimationFrame(render);
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const handleResize = () => {
      targetX = Math.min(targetX, window.innerWidth);
      targetY = Math.min(targetY, window.innerHeight);
    };

    frame = window.requestAnimationFrame(render);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="dashboard-backdrop">
      <div className="dashboard-scanlines" />
      <div className="dashboard-noise" />
      <svg className="dashboard-routes" viewBox="0 0 1600 1000" preserveAspectRatio="none">
        <path className="dashboard-route dashboard-route--primary" d="M120 700C320 520 420 460 620 420C880 368 1000 450 1480 170" />
        <path className="dashboard-route dashboard-route--secondary" d="M160 250C380 350 540 390 790 320C1040 250 1170 150 1440 230" />
        <path className="dashboard-route dashboard-route--tertiary" d="M240 920C460 760 640 650 860 640C1110 628 1260 730 1510 620" />
      </svg>
      <div className="dashboard-node dashboard-node--alpha" />
      <div className="dashboard-node dashboard-node--bravo" />
      <div className="dashboard-node dashboard-node--charlie" />
      <div className="dashboard-node dashboard-node--delta" />
      <div className="dashboard-ping dashboard-ping--one" />
      <div className="dashboard-ping dashboard-ping--two" />
      <div className="dashboard-ping dashboard-ping--three" />
      <div className="dashboard-orb dashboard-orb--blue" />
      <div className="dashboard-orb dashboard-orb--green" />
      <div className="dashboard-orb dashboard-orb--amber" />
      <div className="dashboard-panel-glow dashboard-panel-glow--top" />
      <div className="dashboard-panel-glow dashboard-panel-glow--bottom" />
      <div className="mouse-halo" />
      <div className="mouse-trail" />
    </div>
  );
}
