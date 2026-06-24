'use client'

export default function PageSkeleton() {
  return (
    <div className="tool-screen active" style={{ animation: 'none' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
          <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
          <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
        </div>
      </div>
      
      <div className="tool-page active" style={{ animation: 'none' }}>
        <div className="tool-header">
          <div className="skeleton-box" style={{ width: '300px', height: '32px', marginBottom: '12px', borderRadius: '8px' }}></div>
          <div className="skeleton-box" style={{ width: '60%', height: '16px', borderRadius: '4px' }}></div>
        </div>
        
        <div className="grid2">
          <div className="card">
            <div className="skeleton-box" style={{ width: '150px', height: '24px', marginBottom: '20px', borderRadius: '6px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '60px', borderRadius: '12px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '60px', borderRadius: '12px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '60px', borderRadius: '12px' }}></div>
            </div>
          </div>
          <div className="card">
            <div className="skeleton-box" style={{ width: '150px', height: '24px', marginBottom: '20px', borderRadius: '6px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '45px', borderRadius: '8px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '45px', borderRadius: '8px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '45px', borderRadius: '8px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '45px', borderRadius: '8px' }}></div>
              <div className="skeleton-box" style={{ width: '100%', height: '45px', borderRadius: '8px' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
