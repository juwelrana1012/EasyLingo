import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((cb) => cb());
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((cb) => cb());
  });
}

export function usePWAInstall() {
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => Boolean(globalDeferredPrompt));
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  useEffect(() => {
    const sync = () => {
      setHasPrompt(Boolean(globalDeferredPrompt));
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    promptListeners.add(sync);

    const onInstalled = () => {
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setHasPrompt(false);
    };

    window.addEventListener('appinstalled', onInstalled);
    sync();

    return () => {
      promptListeners.delete(sync);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installDirectly = useCallback(async () => {
    if (!globalDeferredPrompt) return false;
    const evt = globalDeferredPrompt;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setHasPrompt(false);
      setIsInstalled(true);
      return true;
    }
    return false;
  }, []);

  return {
    canPrompt: hasPrompt,
    isInstalled,
    installDirectly,
  };
}
