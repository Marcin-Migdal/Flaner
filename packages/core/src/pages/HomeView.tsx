import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

function LinkCard({ title, description, to }: { title: string; description: string; to: string }) {
  return (
    <NavLink
      to={to}
      className="block p-6 bg-card border border-border rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/[0.02]"
    >
      <h3 className="text-lg font-bold text-foreground mb-1 transition-colors group-hover:text-brand">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </NavLink>
  );
}

export function HomeView() {
  const { t } = useTranslation('common');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-brand-dark/40 via-card to-card border border-brand/20 rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-72 h-72 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <h1 className="text-3xl font-bold mb-2 text-foreground">{t('home.title')}</h1>
        <p className="text-brand-light/80 text-sm md:text-base max-w-xl">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LinkCard
          title={t('nav.shopping')}
          description={t('home.cards.shopping')}
          to="/shopping"
        />
        <LinkCard
          title={t('nav.scheduling')}
          description={t('home.cards.scheduling')}
          to="/scheduling"
        />
        <LinkCard
          title={t('nav.community')}
          description={t('home.cards.community')}
          to="/community"
        />
        <LinkCard
          title={t('nav.settings')}
          description={t('home.cards.settings')}
          to="/settings"
        />
      </div>
    </div>
  );
}

export default HomeView;
