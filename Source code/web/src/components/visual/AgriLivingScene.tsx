import React, { Suspense, useEffect, useState } from 'react';
import '@designcodeio/threeui/style.css';

const SylvaLivingWorldScene = React.lazy(() =>
  import('@designcodeio/threeui').then((module) => ({
    default: module.SylvaLivingWorldScene,
  }))
);

type AgriLivingSceneProps = {
  className?: string;
  decorative?: boolean;
};

const AgriLivingScene: React.FC<AgriLivingSceneProps> = ({ className = '', decorative = true }) => {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 720px)');
    const sync = () => setCanRender(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <div
      aria-hidden={decorative || undefined}
      className={`agri-living-scene${className ? ` ${className}` : ''}`}
      role={decorative ? undefined : 'img'}
    >
      {canRender && (
        <Suspense fallback={<div className="agri-living-scene__fallback" />}>
          <SylvaLivingWorldScene />
        </Suspense>
      )}
    </div>
  );
};

export default React.memo(AgriLivingScene);
