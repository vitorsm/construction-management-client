import React from 'react';
import './PieChart.css';

function PieChart({ 
  data = {}, 
  colorMap = {}, 
  size = 200, 
  radius = 80,
  showLegend = true,
  emptyMessage = 'No data available',
  className = ''
}) {
  // Get all entries and their counts
  const dataEntries = Object.entries(data).map(([key, value]) => ({
    key,
    count: value || 0
  })).filter(item => item.count > 0);
  
  if (dataEntries.length === 0) {
    return (
      <div className={`pie-chart-container ${className}`}>
        <div className="pie-chart-empty">{emptyMessage}</div>
      </div>
    );
  }
  
  // Calculate total
  const total = dataEntries.reduce((sum, item) => sum + item.count, 0);
  
  // Generate pie chart segments
  const centerX = size / 2;
  const centerY = size / 2;
  let currentAngle = -90; // Start from top
  
  const segments = dataEntries.map((item, index) => {
    const percentage = (item.count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // Convert angles to radians
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    // Calculate start and end points
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    // Large arc flag (1 if angle > 180, 0 otherwise)
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Create path
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    const color = colorMap[item.key] || '#95a5a6';
    
    currentAngle = endAngle;
    
    return {
      pathData,
      color,
      label: item.key,
      count: item.count,
      percentage: Math.round(percentage * 10) / 10
    };
  });
  
  return (
    <div className={`pie-chart-container ${className}`}>
      <svg width={size} height={size} className="pie-chart-svg">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.pathData}
            fill={segment.color}
            stroke="white"
            strokeWidth="2"
            className="pie-segment"
          />
        ))}
      </svg>
      {showLegend && (
        <div className="pie-chart-legend">
          {segments.map((segment, index) => (
            <div key={index} className="pie-chart-legend-item">
              <div 
                className="pie-chart-legend-color" 
                style={{ backgroundColor: segment.color }}
              ></div>
              <div className="pie-chart-legend-text">
                <span className="pie-chart-legend-label">{segment.label}</span>
                <span className="pie-chart-legend-value">
                  {segment.count} ({segment.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PieChart;

