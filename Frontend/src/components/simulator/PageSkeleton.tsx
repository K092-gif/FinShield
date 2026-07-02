'use client'
import '../ui/PageSkeleton.css';


export default function PageSkeleton() {
  return (
    <div className="tool-screen active pskel-no-anim">
      {/* Header Skeleton */}
      <div className="pskel-nav">
        <div className="pskel-nav-group">
          <div className="skeleton-box pskel-nav-btn"></div>
          <div className="skeleton-box pskel-nav-btn"></div>
          <div className="skeleton-box pskel-nav-btn"></div>
        </div>
      </div>
      
      <div className="tool-page active pskel-no-anim">
        <div className="tool-header">
          <div className="skeleton-box pskel-header-title"></div>
          <div className="skeleton-box pskel-header-sub"></div>
        </div>
        
        <div className="grid2">
          <div className="card">
            <div className="skeleton-box pskel-card-title"></div>
            <div className="pskel-card-group">
              <div className="skeleton-box pskel-input-lg"></div>
              <div className="skeleton-box pskel-input-lg"></div>
              <div className="skeleton-box pskel-input-lg"></div>
            </div>
          </div>
          <div className="card">
            <div className="skeleton-box pskel-card-title"></div>
            <div className="pskel-card-group">
              <div className="skeleton-box pskel-input-sm"></div>
              <div className="skeleton-box pskel-input-sm"></div>
              <div className="skeleton-box pskel-input-sm"></div>
              <div className="skeleton-box pskel-input-sm"></div>
              <div className="skeleton-box pskel-input-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

