# Image to PDF Converter

A simple web application that allows users to convert images to PDF format easily.

## Features

- Upload multiple images via drag-and-drop or file selection
- Reorder images to control the page order in the PDF
- Remove unwanted images
- Customize the output PDF filename
- Dark/Light mode toggle
- Responsive design for mobile and desktop
- No server-side processing - all conversion happens in the browser

## Technical Stack

- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- @react-pdf/renderer for PDF generation
- Lucide React for icons

## Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Build for production:
   ```
   npm run build
   ```

## Limitations

- Maximum individual file size: 10MB
- Maximum total size: 50MB
- Only accepts image files

## Deployment

This application is deployed on Vercel. You can deploy your own instance by:

1. Fork this repository
2. Connect it to your Vercel account
3. Deploy

## License

MIT

## Author

@hamzaalsiyabi 