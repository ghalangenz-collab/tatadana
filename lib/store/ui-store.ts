'use client';

import { useState, useEffect, useCallback } from 'react';

type Listener = () => void;

class UIStore {
  private isMobileSidebarOpen: boolean = false;
  private listeners: Set<Listener> = new Set();

  public getMobileSidebarOpen(): boolean {
    return this.isMobileSidebarOpen;
  }

  public setMobileSidebarOpen(open: boolean): void {
    if (this.isMobileSidebarOpen !== open) {
      this.isMobileSidebarOpen = open;
      this.notify();
    }
  }

  public toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Error in UIStore listener:', e);
      }
    });
  }
}

export const uiStore = new UIStore();

export function useMobileSidebar() {
  const [isOpen, setIsOpen] = useState(uiStore.getMobileSidebarOpen());

  useEffect(() => {
    const unsub = uiStore.subscribe(() => {
      setIsOpen(uiStore.getMobileSidebarOpen());
    });
    return () => unsub();
  }, []);

  const open = useCallback(() => {
    uiStore.setMobileSidebarOpen(true);
  }, []);

  const close = useCallback(() => {
    uiStore.setMobileSidebarOpen(false);
  }, []);

  const toggle = useCallback(() => {
    uiStore.toggleMobileSidebar();
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
