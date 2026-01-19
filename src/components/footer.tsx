export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-display text-lg tracking-widest text-foreground">
            BORUSSIA MINERALS
          </span>
          <span className="text-xs text-muted-foreground">
            &copy; {currentYear} Borussia Minerals. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
