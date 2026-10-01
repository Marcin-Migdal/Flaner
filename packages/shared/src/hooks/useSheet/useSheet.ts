import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

export interface UseSheetOptions {
  /** Initial open state if no hash matches */
  defaultOpen?: boolean;
  /** The URL hash that should automatically open this sheet (e.g., "#friend-requests") */
  hashTarget?: string;
}

export interface UseSheetActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

/**
 * Custom hook to manage the state of a Sheet (or Dialog) component.
 * Optionally handles automatic opening when the URL hash matches a target,
 * and clears the hash immediately after.
 */
export function useSheet(options: UseSheetOptions = {}): [boolean, UseSheetActions] {
  const { defaultOpen = false, hashTarget } = options;
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(() => {
    if (hashTarget && location.hash === hashTarget) {
      return true;
    }
    return defaultOpen;
  });

  const [prevHash, setPrevHash] = useState(location.hash);

  // Derived state to catch hash changes from navigation
  if (hashTarget && location.hash !== prevHash) {
    setPrevHash(location.hash);
    if (location.hash === hashTarget) {
      setIsOpen(true);
    }
  }

  // Clear hash after consuming it
  useEffect(() => {
    if (hashTarget && location.hash === hashTarget) {
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate, hashTarget]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const setOpen = useCallback((val: boolean) => setIsOpen(val), []);

  return [isOpen, { open, close, toggle, setOpen }];
}
