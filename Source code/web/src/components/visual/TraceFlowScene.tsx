import React, { Suspense, useEffect, useState } from 'react';
import '@designcodeio/threeui/style.css';

const StreamConvergenceBackground = React.lazy(() =>
  import('@designcodeio/threeui').then((module) => ({
    default: module.StreamConvergenceBackground,
  }))
);

const TraceFlowScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 720px)');
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <div className={`trace-flow-scene${className ? ` ${className}` : ''}`} aria-hidden="true">
      {enabled && (
        <Suspense fallback={<div className="trace-flow-scene__fallback" />}>
          <StreamConvergenceBackground />
        </Suspense>
      )}
    </div>
  );
};

export default React.memo(TraceFlowScene);
