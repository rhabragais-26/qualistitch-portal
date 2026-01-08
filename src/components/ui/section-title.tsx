import { cn } from "@/lib/utils";

type SectionTitleProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <div className={cn("relative h-12 w-full max-w-md", className)}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 48"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Border */}
        <path
          d="M372 1.5L398.5 24L372 46.5H28L1.5 24L28 1.5H372Z"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* Main dark background */}
        <path
          d="M371 3L396 24L371 45H29L4 24L29 3H371Z"
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--background))"
          strokeWidth="2"
        />
        {/* Left inner diamond */}
        <path
          d="M48 4L70 24L48 44L26 24L48 4Z"
          fill="hsl(var(--primary) / 0.5)"
        />
        {/* Right inner diamond */}
        <path
          d="M352 4L374 24L352 44L330 24L352 4Z"
          fill="hsl(var(--primary) / 0.5)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="text-lg font-bold tracking-wider text-primary-foreground">
          {children}
        </h2>
      </div>
    </div>
  );
}
