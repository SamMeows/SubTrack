'use client';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        aria-label="메뉴 열기"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </header>
  );
}
