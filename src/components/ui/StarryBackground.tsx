"use client";

import { useEffect, useState } from "react";

interface Star {
  top: string;
  left: string;
  delay: string;
  duration: string;
  scale: string;
}

export default function StarryBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Gera partículas só no CLIENTE
    const generatedStars = Array.from({ length: 1000 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
      duration: `${12 + Math.random() * 12}s`,
      scale: `${0.5 + Math.random() * 1.5}`,
    }));
    setStars(generatedStars);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const spans = document.querySelectorAll<HTMLSpanElement>(".starry-bg span");

      spans.forEach((span) => {
        const rect = span.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - e.clientX;
        const dy = rect.top + rect.height / 2 - e.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const angle = Math.atan2(dy, dx);
          const force = 50 + Math.random() * 50;
          const offsetX = Math.cos(angle) * force + "px";
          const offsetY = Math.sin(angle) * force + "px";

          span.style.setProperty("--dx", offsetX);
          span.style.setProperty("--dy", offsetY);

          span.classList.add("exploding");
          setTimeout(() => span.classList.remove("exploding"), 800);
        }
      });
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="starry-bg">
      {stars.map((star, i) => (
        <span
          key={i}
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
            transform: `scale(${star.scale})`,
          }}
          className="animate-twinkle animate-floaty"
        />
      ))}
    </div>
  );
}
