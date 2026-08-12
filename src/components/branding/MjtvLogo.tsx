import Image from "next/image";

type MjtvLogoProps = {
  className?: string;
  priority?: boolean;
  variant: "horizontal" | "mark";
};

const assets = {
  horizontal: {
    src: "/branding/mjtv-logo-horizontal.webp",
    width: 1024,
    height: 360,
  },
  mark: {
    src: "/branding/mjtv-mark.webp",
    width: 512,
    height: 512,
  },
} as const;

export function MjtvLogo({ className, priority = false, variant }: MjtvLogoProps) {
  const asset = assets[variant];

  return (
    <Image
      src={asset.src}
      alt=""
      width={asset.width}
      height={asset.height}
      className={className}
      priority={priority}
      aria-hidden
    />
  );
}
