import React from 'react';

/**
 * PiFaceAnnoyedBoredStroke icon from the stroke style in general category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiFaceAnnoyedBoredStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'face-annoyed-bored icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15H8m2-5H8m8 0h-2m-2 11.15a9.15 9.15 0 1 1 0-18.3 9.15 9.15 0 0 1 0 18.3Z" fill="none"/>
    </svg>
  );
}
