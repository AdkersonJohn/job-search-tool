# Desktop App Setup

This React app has been configured to run as a desktop application using Electron.

## 🚀 Quick Start

### Development Mode

```bash
# Start the app in development mode (both web and desktop)
npm run electron-dev
```

### Production Build

```bash
# Build the desktop app for your platform
npm run dist
```

## 📦 Available Scripts

- `npm run electron-dev` - Start development mode with hot reload
- `npm run electron` - Run Electron with built React app
- `npm run dist` - Build production desktop app
- `npm run electron-pack` - Build and package the app

## 🖥️ Desktop Features

### Native Desktop Experience

- ✅ Native window with proper title bar
- ✅ App menu with File, Edit, View, Window options
- ✅ Keyboard shortcuts (Cmd/Ctrl+N for new search)
- ✅ Proper app lifecycle management
- ✅ Cross-platform support (Windows, macOS, Linux)

### Security

- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Secure preload script
- ✅ No direct access to Node.js APIs from renderer

### User Experience

- ✅ Responsive window sizing (800x600 minimum)
- ✅ Development tools in dev mode
- ✅ Proper window state management
- ✅ Native app behavior on macOS

## 🛠️ Building for Distribution

### macOS

```bash
npm run dist
# Creates: dist/Job Search Tool-0.1.0.dmg
```

### Windows

```bash
npm run dist
# Creates: dist/Job Search Tool Setup 0.1.0.exe
```

### Linux

```bash
npm run dist
# Creates: dist/Job Search Tool-0.1.0.AppImage
```

## 📁 File Structure

```
public/
├── electron.js      # Main Electron process
├── preload.js       # Secure preload script
└── logo512.png      # App icon

src/
├── types/
│   └── electron.d.ts # TypeScript declarations
└── App.tsx          # Updated with Electron integration
```

## 🔧 Configuration

The app is configured in `package.json` with:

- App ID: `com.jobsearchtool.app`
- Product name: "Job Search Tool"
- Category: Productivity (macOS)
- Icons: Uses React logo (can be customized)

## 🎯 Usage

1. **Development**: Run `npm run electron-dev` for live development
2. **Testing**: Use `npm run electron` to test the built app
3. **Distribution**: Use `npm run dist` to create installable packages

## 📝 Notes

- The app maintains all web functionality in desktop form
- No additional dependencies required for desktop features
- Cross-platform compatibility out of the box
- Secure by default with proper Electron security practices
