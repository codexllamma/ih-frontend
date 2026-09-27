import { useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const LANGUAGES = [
  { label: "English", code: "en" },
  { label: "Hindi (हिंदी)", code: "hi" },
  { label: "Marathi (मराठी)", code: "mr" },
  { label: "Spanish (Español)", code: "es" },
  { label: "French (Français)", code: "fr" },
  { label: "German (Deutsch)", code: "de" },
  { label: "Tamil (தமிழ்)", code: "ta"},
];

const LanguagesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const GoogleTranslate = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 1. Handle Cookies
  useEffect(() => {
    if (typeof document !== "undefined") {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; googtrans=`);
      if (parts.length === 2) {
        const langCode = parts.pop()?.split(";").shift();
        if (langCode) {
           const target = langCode.substring(langCode.length - 2);
           setCurrentLang(target);
        }
      }
    }
  }, []);

  // 2. Initialize Script
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: LANGUAGES.map((l) => l.code).join(","),
            autoDisplay: false,
            // layout: Vertical usually generates less UI clutter than the default banner
            layout: window.google.translate.TranslateElement.InlineLayout.VERTICAL, 
          },
          "google_translate_element"
        );
      }
    };

    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const addScript = document.createElement("script");
      addScript.id = scriptId;
      addScript.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      addScript.async = true;
      document.body.appendChild(addScript);
    } else if (window.google && window.google.translate) {
      window.googleTranslateElementInit();
    }
  }, []);

  // 3. Change Language Helper
  const changeLanguage = (langCode: string) => {
    const googleSelect = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (googleSelect) {
      googleSelect.value = langCode;
      googleSelect.dispatchEvent(new Event("change", { bubbles: true }));
      setCurrentLang(langCode);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={wrapperRef}>
      {/* Custom Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`custom-translate-btn ${isOpen ? 'open' : ''}`}
      >
        <LanguagesIcon className="icon-main" />
        <span className="lang-text">
          {LANGUAGES.find((l) => l.code === currentLang)?.label.split(" ")[0] || "English"}
        </span>
        <ChevronDownIcon className="icon-chevron" />
      </button>

      {/* Custom Dropdown */}
      {isOpen && (
        <div className="custom-translate-dropdown animate-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`dropdown-item ${currentLang === lang.code ? 'active' : ''}`}
            >
              <span className="item-text">{lang.label}</span>
              {currentLang === lang.code && <CheckIcon className="icon-check" />}
            </button>
          ))}
        </div>
      )}

      {/* THE ACTUAL GOOGLE WIDGET CONTAINER */}
      <div 
        id="google_translate_element" 
        className="absolute top-0 left-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
        style={{ visibility: 'hidden', position: 'absolute', width: '1px', height: '1px' }}
      ></div>

      {/* FORCEFUL CSS OVERRIDES & COMPONENT STYLES */}
      <style>{`
        /* --- Premium Custom Button & Dropdown Styles --- */
        .custom-translate-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 9999px;
          transition: all 0.3s ease;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #475569;
          font-family: system-ui, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .custom-translate-btn:hover {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.2);
          color: #1e293b;
        }
        .custom-translate-btn.open {
          background: #eef2ff; /* Indigo tint */
          border-color: #c7d2fe;
          color: #4f46e5;
        }
        
        .icon-main { width: 20px; height: 20px; }
        .icon-chevron { width: 16px; height: 16px; transition: transform 0.3s ease; }
        .custom-translate-btn.open .icon-chevron { transform: rotate(180deg); }
        .lang-text { font-size: 14px; font-weight: 600; }
        @media (max-width: 640px) { .lang-text { display: none; } }

        .custom-translate-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 12px);
          width: 220px;
          display: flex;
          flex-direction: column;
          background: #1e1e24;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 8px 0;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          transform-origin: top right;
          z-index: 10000;
        }
        .animate-in {
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(-5px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 20px;
          background: transparent;
          border: none;
          color: #d1d5db;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: system-ui, sans-serif;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .dropdown-item.active {
          color: #818cf8;
          font-weight: 600;
          background: rgba(99, 102, 241, 0.1);
        }
        .item-text { flex: 1; }
        .icon-check { width: 16px; height: 16px; animation: checkPop 0.2s ease-out; }
        @keyframes checkPop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }

        /* --- Google Hide Overrides --- */
        .VIpgJd-ZVi9od-aZ2wEe-OiiCO, 
        .VIpgJd-ZVi9od-aZ2wEe-OiiCO-ti6hGc {
            display: none !important;
        }
        iframe.goog-te-banner-frame,
        .goog-te-banner-frame {
            display: none !important;
        }
        body { top: 0px !important; margin-top: 0px !important; position: static !important; }
        .goog-te-gadget { visibility: hidden !important; position: absolute !important; top: -9999px !important; }
        .goog-tooltip, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      `}</style>
    </div>
  );
};

export default GoogleTranslate;
