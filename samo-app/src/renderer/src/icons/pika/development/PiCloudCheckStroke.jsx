import React from 'react';

/**
 * PiCloudCheckStroke icon from the stroke style in development category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiCloudCheckStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'cloud-check icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 13.597 2.341 2.339A15 15 0 0 1 15.9 11m-3.4-6a6.5 6.5 0 0 1 6.168 4.444A5.501 5.501 0 0 1 16.5 20h-10a4.5 4.5 0 0 1-.483-8.974A6.5 6.5 0 0 1 12.5 5Z" fill="none"/>
    </svg>
  );
}
