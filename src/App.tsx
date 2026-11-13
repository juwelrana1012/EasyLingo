import React from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AppProvider, useApp } from './context/AppContext';
import { HomePage } from './pages/HomePage';
import { LanguageSettingsPage } from './pages/LanguageSettingsPage';
import { ThemesSettingsPage } from './pages/ThemesSettingsPage';
import { WorkspacePage } from './pages/WorkspacePage';

function Shell() {
  const { view } = useApp();

  return (
    <div className="relative min-h-screen flex flex-col lb-bg lb-text">
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1">
          {view === 'language' ? (
            <LanguageSettingsPage />
          ) : view === 'themes' ? (
            <ThemesSettingsPage />
          ) : view === 'workspace' ? (
            <WorkspacePage />
          ) : (
            <HomePage />
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
