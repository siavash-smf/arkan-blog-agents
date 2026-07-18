/**
 * آیکون‌های SVG — استایل Lucide (stroke=2، خطی، یکدست).
 * قاعده‌ی دیزاین: ایموجی هرگز به‌جای آیکون ساختاری استفاده نمی‌شود؛
 * SVG قابل رنگ‌آمیزی با توکن‌هاست و بین سیستم‌عامل‌ها یکسان رندر می‌شود.
 */

type IconProps = { className?: string };

function Svg({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ── ایجنت‌ها ── */

export const IconIdea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 1 0 8 11.5c.8.8 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 21h4" />
  </Svg>
);

export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

export const IconPen = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

export const IconClipboardCheck = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </Svg>
);

export const IconTrendingUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
    <path d="M16 7h6v6" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
);

export const IconBrain = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M12 5v13" />
  </Svg>
);

/* ── عمومی ── */

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSpinner = ({ className = "h-5 w-5" }: IconProps) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconThumbsUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </Svg>
);

export const IconThumbsDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconMessage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export const IconFileText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </Svg>
);

export const IconFactory = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M17 18h1" />
    <path d="M12 18h1" />
    <path d="M7 18h1" />
  </Svg>
);

export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </Svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconSparkles = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);

/* ── شبکه‌های اجتماعی ── */

export const IconInstagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </Svg>
);

export const IconLinkedin = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M7.5 10.5V17" />
    <path d="M7.5 7.5h.01" />
    <path d="M11.5 17v-3.5a2.5 2.5 0 0 1 5 0V17" />
    <path d="M11.5 10.5V17" />
  </Svg>
);

/** بازآفرینی — چرخه‌ی تبدیل یک محتوا به قالبی دیگر */
export const IconRecycle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 14.5 8h-5L12 3.5Z" />
    <path d="M18.5 9.5 21 14l-4.5 1" />
    <path d="M5.5 9.5 3 14l4.5 1" />
    <path d="M8 20.5h8" />
    <path d="M9.5 18 8 20.5 9.5 23" />
  </Svg>
);

export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" />
    <path d="m15.4 6.5-6.8 4" />
  </Svg>
);

/** ریلز — قاب فیلم */
export const IconVideo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m16 11 6-3.5v9L16 13" />
  </Svg>
);

/** تهیه‌ی منبع — دریافت و تمیزکردن محتوا */
export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 20h16" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

/**
 * نگاشت شناسه‌ی ایجنت → آیکون (برای تایم‌لاین استودیو و لندینگ).
 * ⚠️ ایجنت جدیدی که اینجا نباشد، در تایم‌لاین بدون آیکون رندر می‌شود —
 *    بی‌سروصدا، بدون خطا. با هر ایجنت جدید این نگاشت را هم به‌روز کن.
 */
export const AGENT_ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  "idea-scout": IconIdea,
  strategist: IconTarget,
  researcher: IconSearch,
  writer: IconPen,
  editor: IconClipboardCheck,
  seo: IconTrendingUp,
  publisher: IconSend,
  critic: IconBrain,
  // فاز ۴ — محتوای شبکه‌های اجتماعی
  repurposer: IconRecycle,
  "social-idea-scout": IconIdea,
  "instagram-strategist": IconTarget,
  "instagram-writer": IconInstagram,
  "linkedin-writer": IconLinkedin,
  "reels-source": IconDownload,
  "reels-writer": IconVideo,
  "social-editor": IconClipboardCheck,
  "social-publisher": IconSend,
};
