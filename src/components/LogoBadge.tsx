import React from 'react';

interface LogoBadgeProps {
  size?: number;
  className?: string;
}

export default function LogoBadge({ size = 56, className = '' }: LogoBadgeProps) {
  const babyHeight = Math.round(size * 0.5);

  return (
    <div
      className={`relative rounded-full bg-[#0F6E56] logo-glow flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        border: '2px solid #F5A623',
      }}
    >
      {/* White baby silhouette: circle head + curved body */}
      <svg
        viewBox="0 0 40 40"
        style={{ height: babyHeight }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%]"
        fill="white"
      >
        <circle cx="20" cy="11" r="6" />
        <path d="M8 34 Q8 18 20 18 Q32 18 32 34 Z" />
      </svg>

      {/* Tiny golden heartbeat line at bottom */}
      <svg
        viewBox="0 0 40 12"
        className="absolute bottom-1 left-1/2 -translate-x-1/2"
        style={{ width: Math.round(size * 0.6) }}
        fill="none"
        stroke="#F5A623"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6 L10 6 L13 2 L16 10 L19 4 L22 8 L25 6 L38 6" />
      </svg>
    </div>
  );
}
