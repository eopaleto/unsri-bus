"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  LogOut,
  Search,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import { searchFeatures, type Feature } from "@/lib/navigation";
import type { Profile } from "@/lib/types";
import { initials } from "@/lib/utils";

export function FeatureSearch({
  admin,
  onSelect,
}: {
  admin: boolean;
  onSelect: (feature: Feature) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = searchFeatures(query, admin);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", shortcut);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", shortcut);
    };
  }, []);
  function choose(feature: Feature) {
    setOpen(false);
    setQuery("");
    setActive(0);
    input.current?.blur();
    onSelect(feature);
  }
  return (
    <div
      className="feature-search"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="feature-search-field">
        <Search size={18} />
        <input
          ref={input}
          role="combobox"
          aria-label="Cari seluruh menu dan fitur"
          aria-expanded={open}
          aria-controls="feature-results"
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[active]
              ? `feature-${results[active].id}`
              : undefined
          }
          placeholder="Cari menu atau fitur..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((index) =>
                Math.max(
                  0,
                  Math.min(
                    results.length - 1,
                    index + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && results[active]) choose(results[active]);
            }
          }}
        />
        {query ? (
          <button
            aria-label="Hapus pencarian"
            onClick={() => {
              setQuery("");
              setActive(0);
              input.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        ) : (
          <kbd>Ctrl K</kbd>
        )}
      </div>
      {open && (
        <div className="feature-results">
          <small>
            {query
              ? `${results.length} fitur ditemukan`
              : "Jelajahi menu & fitur"}
          </small>
          <div
            id="feature-results"
            role="listbox"
            aria-label="Hasil pencarian fitur"
          >
            {results.map((feature, index) => (
              <button
                key={feature.id}
                id={`feature-${feature.id}`}
                role="option"
                aria-selected={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(feature)}
              >
                <span>
                  <strong>{feature.label}</strong>
                  <small>{feature.description}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          {!results.length && (
            <p role="status">
              Tidak ada fitur yang cocok. Coba “pesanan”, “profil”, atau
              “bantuan”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ProfileDropdown({
  profile,
  busy,
  currentPage,
  onNavigate,
  onLogout,
}: {
  profile: Profile;
  busy: boolean;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (open) menu.current?.focus();
  }, [open]);
  function select(page: string) {
    setOpen(false);
    trigger.current?.focus();
    onNavigate(page);
  }
  return (
    <div
      className="profile-dropdown"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="header-profile"
        aria-label={`Menu akun ${profile.full_name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="avatar">{initials(profile.full_name)}</span>
        <span>
          <strong>{profile.full_name}</strong>
          <small>
            {profile.role === "admin" ? "Administrator" : "Mahasiswa UNSRI"}
          </small>
        </span>
        <ChevronDown size={17} />
      </button>
      {open && (
        <div
          ref={menu}
          className="account-menu"
          id="account-menu"
          role="menu"
          tabIndex={-1}
          aria-label="Menu akun"
          onKeyDown={(e) => {
            const items = Array.from(
              menu.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ) || [],
            );
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? items.length - 1
                    : (index +
                        (e.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            }
          }}
        >
          <div className="account-summary">
            <strong>{profile.full_name}</strong>
            <small>{profile.email || profile.nim}</small>
          </div>
          <button role="menuitem" className={currentPage === "profile" ? "active" : undefined}
            aria-current={currentPage === "profile" ? "page" : undefined} onClick={() => select("profile")}>
            <UserRound size={17} /> Profil saya
          </button>
          <button
            role="menuitem"
            className="logout-item"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={17} /> {busy ? "Keluar..." : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
