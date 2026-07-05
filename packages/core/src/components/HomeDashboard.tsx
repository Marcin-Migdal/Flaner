import React from 'react';
import { NavLink } from 'react-router';

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

export function HomeDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-brand-dark/40 via-card to-card border border-brand/20 rounded-2xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-72 h-72 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome to Flaner</h1>
        <p className="text-brand-light/80 text-sm md:text-base max-w-xl">
          Your personal planning and organization assistant in the new monorepo architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LinkCard
          title="Shopping"
          description="Manage your shopping lists and product categories without delays."
          to="/shopping"
        />
        <LinkCard
          title="Scheduling"
          description="Plan events with friends in an interactive calendar."
          to="/scheduling"
        />
        <LinkCard
          title="Community"
          description="Connect, search for friends, and create groups."
          to="/community"
        />
        <LinkCard
          title="Settings"
          description="Customize dark theme, change display name and avatar."
          to="/settings"
        />
      </div>
    </div>
  );
}

export default HomeDashboard;
