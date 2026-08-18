export default function SparrowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="24" fill="var(--color-accent-soft)" />
      {/* tail */}
      <path d="M9 30c-2.5 1-4 3-4 5 2.5 0 5-1 7-2.6L9 30Z" fill="var(--color-mocha-dark)" />
      {/* body */}
      <path
        d="M12 29c0-8 6.5-14.5 15-14.5 6 0 9.8 3.4 11 6.4.6 1.4-.3 2.9-1.8 3-1.1.1-2 .9-2 2 0 6.6-6 11.6-13.2 11.6-5 0-9-3.6-9-8.5Z"
        fill="var(--color-mocha)"
      />
      {/* belly */}
      <path
        d="M17 30.5c0-4.2 3.3-8 8-8 3.4 0 5.7 1.9 6.7 4.1.6 1.4-.2 2.9-2.4 3.4-.6 4-4 6.9-8 6.9-2.6 0-4.3-2.7-4.3-6.4Z"
        fill="#fdf8f2"
      />
      {/* wing */}
      <path
        d="M21 22c3-2 7-2 9 1-1.6 2-5.4 3-8.6 1.6-1-.4-1.3-2-.4-2.6Z"
        fill="var(--color-mocha-dark)"
      />
      {/* beak */}
      <path d="M35 20.5 39 21.7 35 23Z" fill="#e0a35a" />
      {/* eye */}
      <circle cx="33" cy="20" r="1.4" fill="#2b211c" />
      {/* cheeks */}
      <circle cx="30.5" cy="23" r="1.6" fill="#f4b28c" opacity="0.7" />
      {/* feet */}
      <path
        d="M22 39.5v2.5M22 39.5l-1.6 2M22 39.5l1.6 2M27 39v2.5M27 39l-1.6 2M27 39l1.6 2"
        stroke="var(--color-mocha-dark)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
