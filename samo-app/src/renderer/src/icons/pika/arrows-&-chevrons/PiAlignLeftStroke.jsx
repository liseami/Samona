import React from 'react';

/**
 * PiAlignLeftStroke icon from the stroke style in arrows-&-chevrons category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiAlignLeftStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'align-left icon',
  ...props 
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: color || "currentColor"}}
      
      role="img"
      aria-label={ariaLabel}
      {...props}
    >
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.03 7.917a20.8 20.8 0 0 0-3.885 3.678A.64.64 0 0 0 8 12m4.03 4.083a20.8 20.8 0 0 1-3.885-3.678A.64.64 0 0 1 8 12m0 0h12M4 5v14" fill="none"/>
    </svg>
  );
}
