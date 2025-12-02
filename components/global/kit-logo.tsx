import React from "react";

const HubStackLogo = ({
  theme = "liUSt",
  className = "",
  width = 400,
  height = 120,
}) => {
  const isDark = theme === "dark";

  // Colors based on theme
  const colors = {
    background: isDark ? "#111827" : "transparent",
    gradientStart: isDark ? "#60a5fa" : "#2563eb",
    gradientEnd: isDark ? "#818cf8" : "#4f46e5",
    textPrimary: isDark ? "#ffffff" : "#1e293b",
    textSecondary: isDark ? "#60a5fa" : "#3b82f6",
    tagline: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <div className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 120"
        className={`w-full h-auto`}
        style={{ maxWidth: width, maxHeight : height }}
      >
         <image
          href="/AFKBerimah_logo-Photoroom.png"    // Put your logo file in the public/ folder
          x="35"                   // Horizontal position
          y="20"                   // Vertical position  
          width="80"               // Logo width
          height="80"              // Logo height
        />

        {/* Text */}
        <text
          x="116"
          y="70"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="40"
          fill={colors.textPrimary}
        >
          AFK
          <tspan fill={colors.textSecondary}>BERIMAH</tspan>
        </text>

        {/* Tagline */}
        <text
          x="123"
          y="90"
          fontFamily="Arial, sans-serif"
          fontSize="14"
          fill={colors.tagline}
        >
          Quality Hardware & Tools
        </text>
      </svg>
    </div>
  );
};

export default HubStackLogo;

