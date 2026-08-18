export default function StarIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.94 6.32 6.85.86-5.09 4.85 1.4 6.87L12 17.9l-6.1 3.4 1.4-6.87-5.09-4.85 6.85-.86Z" />
    </svg>
  );
}
