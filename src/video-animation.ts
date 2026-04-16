'use client';

/**
 * Video & Animation capabilities for raeditor.
 *
 * Import this file and call `enableVideoAnimation()` to turn on the full
 * animation / video workflow (timeline, animations panel, GIF export, etc.).
 *
 * All exports below are the public surface for video / animation features.
 */

// ─── Feature flag ────────────────────────────────────────────────────────────

export { setAnimationsEnabled } from './utils/flags';

/**
 * Enable the complete video + animation workflow in one call.
 * Must be called before the store / workspace is mounted.
 */
export function enableVideoAnimation(): void {
  import('./utils/flags').then(({ setAnimationsEnabled }) => {
    setAnimationsEnabled(true);
  });
}

// ─── Timeline UI ─────────────────────────────────────────────────────────────

/**
 * `PagesTimeline` — horizontal timeline bar placed below the workspace.
 * Shows page thumbnails (with drag-to-reorder and resize-to-set-duration),
 * a playhead, audio tracks, and play/pause controls.
 *
 * Usage:
 *   <PagesTimeline store={store} defaultOpened />
 *
 * Props:
 *   store         — raeditor StoreType
 *   defaultOpened — whether the timeline panel starts expanded (default false)
 */
export { PagesTimeline, Pages } from './pages-timeline/pages-timeline';

// ─── Side-panel sections ──────────────────────────────────────────────────────

/**
 * `AnimationsPanel` — side panel that lets users pick enter/exit animations
 * (Move, Fade, Zoom) and loop effects (Rotate, Blink, Bounce) for the
 * currently selected element, with delay/duration/strength controls.
 *
 * This panel is opened programmatically via `store.openSidePanel('animation')`.
 */
export { AnimationsPanel } from './side-panel/animations-panel';

/**
 * `VideosPanel` — side panel section for browsing and inserting video clips.
 */
export { VideosPanel } from './side-panel/videos-panel';

/**
 * `VideosSection` — pre-built SidePanel section object (name + Tab + Panel).
 * Pass it in the `sections` array of `<SidePanel>` to add a Videos tab.
 */
export { VideosSection } from './side-panel/side-panel';

// ─── Toolbar components ───────────────────────────────────────────────────────

/**
 * `AnimationsPicker` — toolbar button that opens the AnimationsPanel side panel.
 * Automatically included in image, svg, figure, text, video, and gif toolbars
 * when `flags.animationsEnabled` is true.
 */
export { AnimationsPicker } from './toolbar/animations-picker';

/**
 * `VideoToolbar`  — toolbar shown when a video element is selected.
 *   Includes: Trim (startTime / endTime scrubber), Volume slider, Clip mask,
 *   and the Animate button.
 *
 * `VideoTrim`    — popover scrubber for trimming video start / end.
 * `VideoClip`    — button to open the image-clip side panel for a video mask.
 */
export { VideoToolbar, VideoTrim, VideoClip } from './toolbar/video-toolbar';

// ─── Canvas elements ──────────────────────────────────────────────────────────

/**
 * `AudioElement` — invisible Konva layer that plays back audio tracks stored
 * in `store.audios[]` in sync with `store.currentTime`.
 */
export { AudioElement } from './canvas/audio';

// ─── Animation utilities ──────────────────────────────────────────────────────

/**
 * Built-in animation functions keyed by name:
 *   fade, rotate, blink, bounce, move, zoom, cameraZoom
 *
 * Each function receives `{ element, dTime, animation }` and returns a partial
 * set of element attributes to apply at that point in time.
 */
export { animations } from './utils/animations';

/**
 * `animate` — run a single animation function by name for the given element
 * and elapsed time. Returns a partial attribute map (e.g. `{ opacity, x, y }`).
 *
 * Example:
 *   const attrs = animate({ element, dTime: 300, animation: { name: 'fade', ... } });
 *   element.set(attrs);
 */
export { animate } from './utils/animations';

/**
 * `registerAnimation` — register a custom animation function so it can be used
 * by name in element.setAnimation() and played by the animation loop.
 *
 * Example:
 *   registerAnimation('spin', ({ dTime, element, animation }) => ({
 *     rotation: (dTime / animation.duration) * 360,
 *   }));
 */
export { registerAnimation } from './utils/animations';

// ─── Video utilities ──────────────────────────────────────────────────────────

/**
 * `getVideoSize`         — returns `{ width, height }` of a video URL.
 * `getVideoDuration`     — returns duration in seconds.
 * `getVideoPreview`      — returns a data-URL thumbnail at a given seek time.
 * `getVideoObjectPreview`— renders a frame from an existing <video> element
 *                          onto a given <canvas> and returns a data-URL.
 */
export { getVideoSize, getVideoDuration, getVideoPreview, getVideoObjectPreview } from './utils/video';

// ─── Store export helpers ─────────────────────────────────────────────────────

/**
 * These methods live on the store instance; listed here for discoverability.
 *
 * store.play({ startTime?, endTime?, animatedElementsIds?, repeat? })
 *   — starts the animation loop.
 *
 * store.stop()
 *   — stops playback and resets currentTime to 0.
 *
 * store.toGIFDataURL({ pixelRatio?, fps? })
 *   — renders all pages as an animated GIF and returns a data URL.
 *
 * store.saveAsGIF({ fileName?, pixelRatio?, fps? })
 *   — triggers a browser download of the animated GIF.
 *
 * store.addAudio({ src, duration, startTime?, endTime?, volume?, delay? })
 *   — adds a background audio track to the project.
 *
 * store.removeAudio(id)
 *   — removes an audio track by its ID.
 *
 * page.duration  (ms)
 *   — duration of this slide when used as a video frame.
 *
 * page.startTime (ms)
 *   — computed start time of this slide within the total timeline.
 *
 * element.setAnimation(type, attrs)
 *   — type: 'enter' | 'exit' | 'loop'
 *   — attrs: { name, enabled, delay, duration, data }
 *
 * element.animations[]
 *   — array of animation configs attached to this element.
 */
export type { StoreType } from './model/store';
