export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-12 text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl gradient-text">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
        {subtitle}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary/50" />
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary/50 to-accent" />
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-accent to-accent/50" />
      </div>
    </header>
  )
}
