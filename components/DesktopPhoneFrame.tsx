"use client";

interface DesktopPhoneFrameProps {
  children: React.ReactNode;
}

export function DesktopPhoneFrame({ children }: DesktopPhoneFrameProps) {
  return (
    <div className="desktop-shell">
      <div className="phone-frame">
        {children}
      </div>
    </div>
  );
}

