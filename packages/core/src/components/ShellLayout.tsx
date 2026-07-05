import React from 'react';
import { NavLink } from 'react-router';
import { Outlet } from 'react-router';
import { useAuth } from '@flaner-v2/shared';
import { Button, Profile } from '@flaner-v2/ui-components';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const NAV_LINKS = [
  { path: '/community', label: 'Community' },
  { path: '/shopping', label: 'Shopping' },
  { path: '/scheduling', label: 'Scheduling' },
  { path: '/settings', label: 'Settings' },
];

export function ShellLayout() {
  const { user, signOutUser } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (user?.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <NavLink
          to="/"
          className="text-xl font-black tracking-wider text-brand hover:text-brand-light transition-colors select-none"
        >
          FLANER
        </NavLink>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand text-zinc-950 font-semibold shadow-md shadow-brand/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="h-6 w-[1px] bg-border hidden sm:block" />

          <div className="flex items-center gap-4">
            <Profile
              username={user?.username}
              avatarUrl={user?.avatarUrl}
              size="sm"
              nameClassName="hidden md:block"
            />
            <Button
              onClick={() => signOutUser()}
              variant="outline"
              size="xs"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default ShellLayout;
