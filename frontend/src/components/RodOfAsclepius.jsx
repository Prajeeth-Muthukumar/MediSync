import React from 'react'

function RodOfAsclepius({ size = 24, color = "currentColor", className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Vertical Staff (Rod) */}
      <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2.5" stroke={color} />
      
      {/* Knob/Circle at the top of the rod */}
      <circle cx="12" cy="2" r="1" fill={color} stroke="none" />
      
      {/* Snake winding around the rod in a traditional S-curve */}
      {/* Winding paths crossing x=12 at multiple heights */}
      <path 
        d="M 12 20 
           C 16 20, 16 16.5, 12 15 
           C 8 13.5, 8 10, 12 8.5 
           C 16 7, 16 4.5, 12 3.5
           C 10 3, 9 4, 10 5" 
        stroke={color}
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default RodOfAsclepius
