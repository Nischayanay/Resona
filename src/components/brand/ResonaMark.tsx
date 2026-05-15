type ResonaMarkProps = {
  className?: string;
};

export function ResonaMark({ className = "resona-mark-icon" }: ResonaMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M15.2 11.8C20 7.9 27.8 7.6 33.1 11.4C38.5 15.3 40.8 22.3 38.6 28.4C36.3 34.8 30.1 39 23.5 38.5C16.9 38 11.5 32.8 10.3 26.3C9.4 21.3 11.2 16.1 15.2 11.8Z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M35.8 14.6C39.3 19.4 39.4 25.9 36 31.2"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M17.1 18.3C20.7 15.1 26.2 14.8 30.1 17.6C34 20.5 35.3 25.7 33.1 29.8C30.8 34 25.5 35.8 21.1 34C16.6 32.1 14.2 27.3 15.4 22.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="4 5"
        opacity="0.62"
      />
      <circle cx="24" cy="24" r="5.1" fill="currentColor" />
    </svg>
  );
}
