import React from 'react';

export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg 
      className={`${className} transition-all duration-300 hover:scale-110`} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glowing gradient for neon light effect */}
        <linearGradient id="logoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" /> {/* Blue 500 */}
          <stop offset="40%" stopColor="#6366f1" /> {/* Indigo 500 */}
          <stop offset="100%" stopColor="#a855f7" /> {/* Purple 500 */}
        </linearGradient>
        <filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Background glow trail */}
      <path 
        d="M20 70C20 40 40 20 70 20C85 20 85 35 70 45C55 55 30 50 20 60C10 70 25 80 50 80C80 80 80 50 80 35" 
        stroke="url(#logoGrad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.4"
        filter="url(#logoGlow)"
      />
      {/* Foreground crisp trail */}
      <path 
        d="M20 70C20 40 40 20 70 20C85 20 85 35 70 45C55 55 30 50 20 60C10 70 25 80 50 80C80 80 80 50 80 35" 
        stroke="url(#logoGrad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Nodes / data-points in the path */}
      <circle cx="70" cy="20" r="5.5" fill="#ffffff" className="animate-pulse" />
      <circle cx="50" cy="80" r="5.5" fill="#ffffff" />
    </svg>
  );
}
