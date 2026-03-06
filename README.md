# TeeMosaic

![TeeMosaic User Interface](public/screenshot.jpg)

TeeMosaic is a client-side application that converts user-uploaded photos into physical golf tee mosaic blueprints. Built with Next.js and Tauri, it provides a comprehensive suite of tools to tune, process, and generate detailed instructions for building real-world artwork out of golf tees.

## Features

- **Image Processing & Filtering**: Upload photos and adjust contrast, brightness, and midtones (gamma correction) to prepare your image.
- **Advanced Dithering Algorithms**: Achieve the exact retro or detailed look you want with multiple dithering options:
  - Floyd-Steinberg Dithering
  - Atkinson Dithering
  - Ordered (Bayer Matrix) Dithering
  - Hybrid Dithering (Detail vs Background processing)
- **Palette Mapping**: Intelligent 3-color mapping designed for physical materials, specifically natural wood, white, and black golf tees.
- **Physical Size Calculator & Grid Sizing**: Adjust the mosaic grid size while maintaining the original aspect ratio and accurately calculate the real-world dimensions of the final physical piece.
- **Blueprint Generation & PDF Export**: Export a high-quality, printable PDF blueprint that outlines exactly where to place each colored tee.
- **Bill of Materials (BoM)**: Automatically tallies the exact amount of each tee color needed to complete your project.
- **Cross-Platform**: Run as a rich web application in your browser or as a native desktop application using Tauri.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React), TypeScript
- **Desktop Framework**: [Tauri](https://tauri.app/) (Rust)
- **State Management**: Zustand
- **Image Processing**: Custom Canvas API logic

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- Rust (for building the Tauri desktop application)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/ghise/TeeMosaic.git
   cd TeeMosaic
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```

### Running Locally

**Web Version:**
Start the standard development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Desktop Version (Tauri):**
Start the desktop application in development mode:
```bash
npm run tauri dev
```

### Building for Production

**Web Build:**
```bash
npm run build
```

**Desktop Executable:**
```bash
npm run tauri build
```
Once the build is complete, you can find the packaged installer and executable in the `src-tauri/target/release/` directory.

## License
This project is licensed under the MIT License.
