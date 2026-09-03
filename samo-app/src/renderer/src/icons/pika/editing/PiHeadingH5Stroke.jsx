import React from 'react';

/**
 * PiHeadingH5Stroke icon from the stroke style in editing category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiHeadingH5Stroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'heading-h5 icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12h8m-8 6V6m8 12V6m8.5 4h-3a1.5 1.5 0 0 0-1.5 1.5V14h3a2 2 0 1 1 0 4h-3" fill="none"/>
    </svg>
  );
}
