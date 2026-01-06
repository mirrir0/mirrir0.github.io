# Terminal Blog Styling Guide

This skill provides styling guidelines for the terminal-style markdown blog built with React Router v7 and Tailwind CSS v4.

## Design Philosophy

This blog uses a **dark terminal aesthetic** with:
- Dark backgrounds (zinc-950)
- Muted text colors (zinc-100 to zinc-600)
- Emerald accent color for interactive elements and code
- Monospace typography (JetBrains Mono)
- Left-justified, readable layouts
- Maximum width of 3xl (48rem) for readability

## Color Palette

```
Background:     bg-zinc-950 (#09090b)
Primary text:   text-zinc-100 (#f4f4f5)
Secondary text: text-zinc-400 (#a1a1aa)
Muted text:     text-zinc-500 (#71717a)
Subtle text:    text-zinc-600 (#52525b)
Borders:        border-zinc-800 (#27272a)
Code bg:        bg-zinc-900 (#18181b)
Accent:         text-emerald-400 (#34d399)
```

## Typography

The blog uses a mix of custom and web fonts:

- **Inter** (Google Fonts): Primary sans-serif font (--font-sans)
- **JetBrains Mono** (Google Fonts): Monospace font for code and UI (--font-mono)
- **Quadrunde** (local .ttf): Display font for headings (--font-display)
- **Kapel** (local .ttf): Brand font for the MIRRIR logo

Usage patterns:
- **Headings**: font-mono or font-display, font-normal weight
- **Body**: font-mono or font-sans depending on context
- **Code**: font-mono with emerald-400 color
- **Links**: emerald-400 with hover underline
- **Logo**: Kapel font, text-5xl, emerald-400

## Component Patterns

### Page Container
```jsx
<div className="min-h-screen w-full max-w-3xl px-4 md:px-6 lg:px-8 flex flex-col">
  <Header />
  <main className="flex-1 px-1">{children}</main>
  <Footer />
</div>
```

### Header
```jsx
<header className="sticky top-0 z-50 py-2 md:py-3 bg-zinc-950">
  <nav className="flex items-center justify-between font-mono">
    <Link to="/" className="hover:opacity-80 transition-opacity flex items-baseline gap-2">
      <span style={{ fontFamily: "Kapel" }} className="text-emerald-400 text-5xl">
        MIRRIR
      </span>
      <span className="text-zinc-500 text-sm font-mono">reflecting online</span>
    </Link>
    <div className="flex items-center gap-4 md:gap-6">
      <Link to="/about" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">
        about
      </Link>
      <Link to="/blog" className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm">
        blog
      </Link>
    </div>
  </nav>
</header>
```

### Footer
```jsx
<footer className="py-8 mt-16 border-t border-zinc-800">
  <div className="flex items-center justify-end gap-4">
    <a href="https://github.com/mirrir0" className="text-zinc-600 hover:text-zinc-400 transition-colors">
      {/* GitHub icon SVG */}
    </a>
    <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="text-zinc-500 text-xs font-mono hover:text-zinc-300 transition-colors">
      CC BY-SA 4.0
    </a>
  </div>
</footer>
```

### Terminal Prompt
```jsx
<div className="flex items-start gap-2">
  <span className="text-emerald-400">$</span>
  <span className="text-zinc-100">command here</span>
</div>
```

### Blog Post Card
```jsx
<article className="group">
  <Link to={`/blog/${slug}`} className="block">
    <div className="flex items-baseline gap-4 mb-1">
      <time className="text-zinc-600 font-mono text-sm shrink-0">
        {date}
      </time>
      <h2 className="text-zinc-100 group-hover:text-emerald-400 transition-colors font-mono">
        {title}
      </h2>
    </div>
  </Link>
</article>
```

### Tags
```jsx
<span className="text-xs font-mono px-2 py-1 bg-zinc-900 text-zinc-500 rounded">
  {tag}
</span>
```

### Back Navigation
```jsx
<Link
  to="/blog"
  className="text-zinc-600 hover:text-zinc-400 font-mono text-sm"
>
  &larr; back to blog
</Link>
```

## Prose Styling (Markdown Content)

For rendered markdown content, use the Tailwind Typography plugin with dark theme customizations:

```jsx
<div className="prose prose-invert prose-zinc max-w-none
  prose-headings:font-mono prose-headings:font-normal
  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
  prose-p:text-zinc-300 prose-p:leading-relaxed
  prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
  prose-code:text-emerald-400 prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
  prose-strong:text-zinc-100
  prose-ul:text-zinc-300 prose-ol:text-zinc-300
  prose-li:marker:text-zinc-600
  prose-hr:border-zinc-800
  prose-blockquote:border-zinc-700 prose-blockquote:text-zinc-400"
>
  {content}
</div>
```

## Animations

- **Cursor blink**: `animate-pulse` on underscore character
- **Hover transitions**: `transition-colors` on interactive elements

## File Structure

```
app/
├── app.css              # Global styles with Tailwind v4 config
├── root.tsx             # Layout with Header, Footer, and Google Fonts
├── fonts/
│   ├── Quadrunde.ttf    # Display font
│   └── kapel/
│       └── Kapel.ttf    # Brand logo font
├── routes/
│   ├── home.tsx         # Terminal-style landing page
│   ├── about.tsx        # About page
│   ├── blog.tsx         # Blog listing page
│   └── blog.$slug.tsx   # Individual post page
└── lib/
    └── markdown.server.ts  # Server-side markdown parsing
```

## Font Setup

Custom fonts are defined in `app.css` using `@font-face`:

```css
@font-face {
  font-family: "Quadrunde";
  src: url("./fonts/Quadrunde.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Kapel";
  src: url("./fonts/kapel/Kapel.ttf") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

Google Fonts (Inter and JetBrains Mono) are imported in `root.tsx` via the `links` export.

Tailwind CSS v4 theme configuration in `app.css`:

```css
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular;
  --font-display: "Quadrunde", sans-serif;
}
```

## Best Practices

1. **Keep layouts narrow** - max-w-3xl for readability
2. **Use monospace fonts** - reinforces terminal aesthetic
3. **Subtle hover states** - text color changes, not backgrounds
4. **Generous spacing** - py-12, space-y-8 for breathing room
5. **Minimal borders** - use sparingly with zinc-800
6. **Consistent accent** - emerald-400 for all interactive elements
