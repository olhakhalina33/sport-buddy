import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Пошук', end: true },
  { to: '/create', label: 'Створити', end: false },
  { to: '/requests', label: 'Заявки', end: false },
];

export function BottomNav({ badge = 0 }: { badge?: number }) {
  return (
    <nav
      aria-label="Основна навігація"
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-line-off bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-app">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `relative flex h-16 items-center justify-center text-btn transition-colors ${
                  isActive ? 'text-brand' : 'text-muted hover:text-fg'
                }`
              }
            >
              {t.label}
              {t.to === '/requests' && badge > 0 && (
                <span
                  aria-label={`${badge} нових`}
                  className="absolute right-[18%] top-3 min-w-5 rounded-full bg-brand px-1.5 text-center text-ps font-bold text-onbtn"
                >
                  {badge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
