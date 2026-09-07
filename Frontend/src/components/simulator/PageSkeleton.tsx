'use client';

import React from 'react';
import '../ui/PageSkeleton.css';

export function SkeletonBox({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton-box ${className}`} style={style} />;
}

export function SkeletonStatsRow({ count = 3 }: { count?: number }) {
  return (
    <div className="pskel-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pskel-stat-card">
          <SkeletonBox className="pskel-stat-header" />
          <SkeletonBox className="pskel-stat-value" />
          <SkeletonBox className="pskel-stat-sub" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChartArea() {
  const barHeights = [45, 68, 52, 85, 60, 92, 74, 88, 65, 78, 95];
  return (
    <div className="pskel-chart-area">
      {barHeights.map((h, idx) => (
        <div
          key={idx}
          className="pskel-chart-bar skeleton-pulse"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonTableRows({ count = 4 }: { count?: number }) {
  return (
    <div className="pskel-rows">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="pskel-row">
          <SkeletonBox className="pskel-avatar" />
          <div className="pskel-text-group">
            <SkeletonBox className="pskel-text-line-main" />
            <SkeletonBox className="pskel-text-line-sub" />
          </div>
          <SkeletonBox className="pskel-text-val" />
        </div>
      ))}
    </div>
  );
}

export default function PageSkeleton() {
  return (
    <div className="pskel-container animate-fade-in">
      {/* Header Skeleton */}
      <div className="pskel-header">
        <SkeletonBox className="pskel-title" />
        <SkeletonBox className="pskel-subtitle" />
      </div>

      {/* 3 Summary Stat Cards */}
      <SkeletonStatsRow count={3} />

      {/* Bento Grid: 2 Column Layout (Left: Chart, Right: Table / List) */}
      <div className="pskel-bento-grid">
        {/* Left Bento Card (Chart / Large Visualization) */}
        <div className="pskel-card">
          <div className="pskel-card-header">
            <SkeletonBox className="pskel-card-title" />
            <SkeletonBox className="pskel-card-action" />
          </div>
          <SkeletonChartArea />
        </div>

        {/* Right Bento Card (List / Holdings / Breakdown) */}
        <div className="pskel-card">
          <div className="pskel-card-header">
            <SkeletonBox className="pskel-card-title" style={{ width: 120 }} />
            <SkeletonBox className="pskel-card-action" style={{ width: 60 }} />
          </div>
          <SkeletonTableRows count={4} />
        </div>
      </div>
    </div>
  );
}


