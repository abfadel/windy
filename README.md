# Windy - TailwindCSS Visual Editor

A standalone TailwindCSS visual editor that can be integrated into any CMS. Built with Preact and Vite.

## Features

✅ **Dual View Mode**: Split view with live preview and source code editor
✅ **Inline Editing**: Double-click any text element in the preview to edit it inline
✅ **Dynamic Sidebar**: Automatically generated form controls based on HTML element schema
✅ **DOM-Order Inspection**: Elements appear in sidebar in the order they appear in the DOM, including nested structures
✅ **Repeatable Elements**: Automatically detects repeatable elements (lists, navigation links, etc.) with add/remove functionality
✅ **Full TailwindCSS Support**: Live preview uses TailwindCSS CDN for immediate styling
✅ **Click to Select**: Click any element in the preview to select and edit it in the sidebar

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The editor will be available at `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

## Usage

### Getting Started

1. **Code View**: Edit HTML source code directly in the left panel
2. **Live Preview**: See changes in real-time in the right panel
3. **Inline Editing**: Double-click text in the preview to edit it inline
4. **Element Selection**: Click any element to select it and view/edit its properties in the sidebar
5. **View Modes**: Toggle between Code, Split, and Preview-only modes

### Sidebar Features

The sidebar dynamically generates form controls for each element:

- **Tag Name**: Shows the HTML tag (read-only)
- **Text Content**: Edit the text content of the element
- **Classes**: Modify TailwindCSS classes
- **Attributes**: Edit HTML attributes (href, src, etc.)

### Repeatable Elements

Elements that are detected as repeatable (list items, navigation links, similar cards) will show:
- A "repeatable" badge
- **Add Similar** button to create a duplicate
- **Remove** button to delete the element

### CMS Integration

To integrate Windy into your CMS:

1. Build the project: `npm run build`
2. Include the built files from the `dist/` directory
3. Mount the editor component where needed
4. Access the HTML content via the editor's state

**Security Considerations for Production:**

⚠️ **Important**: This editor is designed for trusted content editing in a CMS environment. For production use:

1. **Server-Side Sanitization**: Always sanitize HTML on the server before saving to the database
2. **Content Security Policy (CSP)**: Implement strict CSP headers to prevent XSS attacks
3. **Input Validation**: Validate user input on both client and server side
4. **HTML Sanitization Library**: Consider using [DOMPurify](https://github.com/cure53/DOMPurify) for client-side HTML sanitization
5. **Local TailwindCSS**: Replace the CDN with a locally bundled version for production
6. **User Permissions**: Restrict editor access to trusted administrators only
7. **Content Review**: Implement a review workflow before publishing user-generated content

The editor includes basic HTML escaping for schema-generated content, but additional layers of security should be implemented based on your specific use case.

## Technology Stack

- **Preact**: Lightweight React alternative (3KB)
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Pure JavaScript**: No TypeScript dependencies for simplicity

## License

ISC
