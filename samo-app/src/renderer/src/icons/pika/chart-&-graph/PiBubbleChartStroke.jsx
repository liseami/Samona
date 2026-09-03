import React from 'react';

/**
 * PiBubbleChartStroke icon from the stroke style in chart-&-graph category.
 * @param {Object} props - Component props
 * @param {number} [props.size=24] - Icon size
 * @param {string} [props.color] - Icon color
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.ariaLabel] - Accessibility label
 */
export default function PiBubbleChartStroke({ 
  size = 24, 
  color,
  className,
  ariaLabel = 'bubble-chart icon',
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
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 8.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" fill="none"/><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" fill="none"/><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.5 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" fill="none"/>
    </svg>
  );
}
