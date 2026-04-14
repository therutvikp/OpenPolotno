# OpenPolotno

[![npm version](https://img.shields.io/npm/v/openpolotno.svg)](https://www.npmjs.com/package/openpolotno)
[![npm downloads](https://img.shields.io/npm/dm/openpolotno.svg)](https://www.npmjs.com/package/openpolotno)
[![license](https://img.shields.io/npm/l/openpolotno.svg)](./LICENSE)

Open-source alternative to Polotno with full template and API support.

<video src="assets/demo.mp4" controls width="100%"></video>

A powerful, extensible React-based design editor framework for building browser-based design tools. Supports multi-page layouts, rich media elements, animations, AI features, and multiple export formats.

---

## Features

- Multi-page design canvas with undo/redo history
- Rich set of supported elements: text, image, SVG, video, GIF, figure, line, HTML, audio, and groups
- Context-sensitive toolbar with element-specific controls
- Side panel with templates, photos, videos, uploads, layers, backgrounds, and more
- Animation system with enter, exit, and loop effects
- AI image generation and AI-powered text writing
- Export to PNG, JPEG, SVG, HTML, PDF, GIF, and PowerPoint (PPTX)
- Google Fonts integration with custom font upload support
- Image filters, effects, cropping, masking, and background removal
- Element alignment, distribution, grouping, locking, and clipboard operations
- Fully extensible: register custom shapes, toolbars, and components
- Localization support via `setTranslations()`

---

## Installation

```bash
npm install openpolotno
```

---

## Quick Start

```tsx
import { createStore } from 'openpolotno/model';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'openpolotno';
import { SidePanel } from 'openpolotno/side-panel';
import { Toolbar } from 'openpolotno/toolbar';
import { Workspace } from 'openpolotno/canvas';

const store = createStore();

export default function App() {
  return (
    <PolotnoContainer>
      <SidePanelWrap>
        <SidePanel store={store} />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} />
        <Workspace store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
}
```

---

## Supported Elements

| Element | Description |
|---------|-------------|
| `text` | Rich text with full typography controls |
| `image` | Raster images with crop, mask, and clip support |
| `svg` | Vector graphics with color replacement |
| `video` | Video playback with seeking |
| `gif` | Animated GIF playback |
| `figure` | Pre-built SVG shapes and icons |
| `line` | Customizable lines with arrow heads and dash patterns |
| `html` | Rich HTML content using a Quill editor |
| `audio` | Audio track metadata |
| `group` | Nested grouping and ungrouping of elements |

All elements share common properties: position, dimensions, rotation, opacity, visibility, filters, shadow, animations, and lock/edit states.

---

## Side Panel Sections

- **Templates** — Pre-designed layout templates
- **Text** — Text insertion and font management
- **Photos** — Stock photo search and insertion
- **Elements** — Pre-built shapes, lines, and figures
- **Upload** — Custom image and media uploads
- **Background** — Page background colors and images
- **Layers** — Hierarchical layer management with visibility toggles
- **Size** — Page and element dimension controls
- **Videos** — Video library integration
- **AI Images** — Stable Diffusion text-to-image generation (requires API key)
- **Animations** — Element entry, exit, and loop animations
- **Effects** — Image and text filtering and color grading
- **Image Clip** — Masking and clipping tools

---

## Toolbar

Universal controls available for all elements:

- Undo / Redo
- Position (X, Y) and alignment (left, right, top, bottom, center)
- Opacity
- Lock / Unlock
- Duplicate
- Delete
- Group / Ungroup
- Copy Style (paint format)
- Export / Download

Type-specific toolbars:

- **Text** — Font, size, weight, style, letter spacing, alignment, line height, AI writing
- **Image** — Crop, flip, background removal
- **SVG** — Per-color replacement
- **Video** — Video-specific controls
- **Line** — Style, width, dash pattern, arrow heads
- **GIF** — Playback controls
- **HTML** — Bold, italic, and rich text formatting
- **Multi-select** — Bulk operations on multiple elements

---

## Animations

The animation system supports three types:

- `enter` — Element appears at page start
- `exit` — Element disappears at page end
- `loop` — Continuous animation during page display

Available effects: **Fade**, **Rotate**, **Blink**, **Bounce**, **Move** (8 directions), **Camera** (zoom/pan), **Morph**, **Wave**

Each animation supports delay, duration, direction, strength, and enable/disable toggle.

---

## Export Options

| Format | Method |
|--------|--------|
| PNG / JPEG | `store.saveAsImage()` |
| SVG | `store.saveAsSVG()` |
| HTML | `store.saveAsHTML()` |
| PDF | `store.saveAsPDF()` |
| Animated GIF | `store.saveAsGIF()` |
| MP4 Video | `store.exportVideo()` |
| PowerPoint | via `to-pptx` utility |
| JSON | `store.toJSON()` / `store.loadJSON()` |

---

## AI Features

### AI Image Generation
The `AiImagesPanel` integrates with Stable Diffusion for text-to-image generation. Requires an external API key. Generated images can be added to the canvas or used to replace a selected image element.

### AI Text Writing
The `TextAiWrite` toolbar component provides GPT-powered text manipulation:
- Rewrite, shorten, continue, proofread
- Tone adjustment: friendly, professional, humorous, formal
- Custom prompt support

---

## Filters & Effects

- Sepia, Grayscale, Natural, Warm, Cold, Temperature
- Contrast, Shadows, Highlights, White point, Black point
- Saturation, Vibrance
- Blur, Brightness
- Shadow (offset, blur, color, opacity)

---

## Customization & Extension

```ts
import {
  registerShapeModel,
  registerShapeComponent,
  registerToolbarComponent,
  setGoogleFonts,
  addGlobalFont,
  setTranslations,
  setUploadFunc,
  setRemoveBackground,
  setHighlighterStyle,
  setTransformerStyle,
} from 'openpolotno/config';
```

- **Custom shapes** — Register new element types with `registerShapeModel` + `registerShapeComponent`
- **Custom toolbar** — Add toolbar sections with `registerToolbarComponent`
- **Fonts** — Set Google Fonts list or add custom fonts
- **Localization** — Override any UI string with `setTranslations()`
- **Upload** — Provide your own upload handler with `setUploadFunc()`
- **Background removal** — Plug in your own removal service with `setRemoveBackground()`

---

## Store API

```ts
// Pages
store.addPage()
store.deletePages(ids)
store.selectPage(id)

// Elements
store.selectElements(ids)
store.deleteElements(ids)
store.groupElements(ids)
store.ungroupElements(id)

// Playback (for animations)
store.play()
store.stop()
store.seek(timeMs)

// History
store.history.undo()
store.history.redo()

// State
store.toJSON()
store.loadJSON(json)
store.clear()
```

---

## Tech Stack

- [React](https://react.dev/) — UI framework
- [Konva.js](https://konvajs.org/) — 2D canvas rendering
- [MobX-State-Tree](https://mobx-state-tree.js.org/) — Reactive state management
- [Blueprint.js](https://blueprintjs.com/) — UI component library
- [MobX](https://mobx.js.org/) — Reactivity

---

## License

See [LICENSE](./LICENSE) for details.
