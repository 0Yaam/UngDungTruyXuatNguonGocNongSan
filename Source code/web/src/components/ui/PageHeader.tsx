import React from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
};

const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className = '',
}) => {
  const titleId = React.useId();

  return (
    <header
      aria-labelledby={titleId}
      className={`agri-page-header${className ? ` ${className}` : ''}`}
    >
      <div className="agri-page-header__copy">
        {eyebrow && <span className="agri-page-header__eyebrow">{eyebrow}</span>}
        <h1 id={titleId}>{title}</h1>
        {description && <p>{description}</p>}
        {actions && <div className="agri-page-header__actions">{actions}</div>}
      </div>
      {aside && <div className="agri-page-header__aside">{aside}</div>}
    </header>
  );
};

export default PageHeader;
