# Agent Office Scene UX Review

## Current Scope

Agent Office is the visual workspace layer for the Personal Multi-Agent System.

The main dashboard remains the operational data view. Agent Office focuses on visualizing realtime agent activity, source flow, skill usage, output generation, and interaction details.

## Current Features

- Clean URL route: `/office`
- Real registered agents only
- Living isometric office scene
- Zoomable and scrollable Office canvas
- Responsive canvas behavior for tablet and mobile
- Server Room visual hub
- WhatsApp Source node
- Manual Console node
- Skill Shelf node
- Output Board node
- design-agent workstation
- Smooth sequential water-like flow animation
- Flow animation runs during visual processing window
- Minimum visible visual flow duration
- Static connectors after task completion
- Draggable Mini Activity Log
- Persisted Mini Activity Log position
- Office Detail Panel
- Click-to-inspect interaction
- Hide Labels preference
- Hide Log preference
- Compact Mode preference
- Persisted zoom level
- Reset Office preferences
- Office anti-flicker render stability
- Theme support
- Sidebar clean route integration

## Current Interaction Rules

- Click any Office element to inspect details.
- Click empty scene area to close the detail panel.
- Press ESC to close the detail panel.
- Use Zoom -, 100%, Zoom +, and Fit to control the Office canvas.
- Use Hide Labels to reduce visual clutter.
- Use Hide Log to hide or show Mini Activity Log.
- Use Compact Mode to reduce overlay density.
- Drag Mini Activity Log by its header.
- Use Reset in the Office toolbar to restore Office view preferences.
- Use Reset inside Mini Activity Log to reset only the log position.

## Visual Flow Logic

### Idle

- Connector ducts remain visible.
- Flow animation is stopped.
- Scene remains stable.

### Processing

Sequential flow animation is shown:

1. Source to Server Room  
   - WhatsApp Source to Server Room, or
   - Manual Console to Server Room

2. Processing path  
   - Skill Shelf to design-agent
   - design-agent to Server Room

3. Output path  
   - Server Room to Output Board

### Done

- Flow animation stops.
- Output connector becomes green/static.
- Output Board shows latest result preview.

### Error

- Flow animation stops.
- Output connector becomes red/static.
- Output Board shows error state.

## Visual Meaning

- Green: idle, WhatsApp, done, output success
- Blue: manual command source
- Orange: processing, agent/server processing path
- Purple: Skill Shelf
- Cyan: Server Room
- Red: error

## Persisted Preferences

The following values are stored in localStorage:

- `office-activity-log-position`
- `office-scene-zoom-level`
- `office-show-labels`
- `office-show-activity-log`
- `office-compact-mode`

## Current Known Intentional Limitations

- No full 3D scene yet.
- No drag-and-drop node layout editor yet.
- Only registered backend agents are displayed.
- Multi-agent layout is prepared but not fully optimized.
- Flow connector coordinates are currently tuned for the current Office scene layout.
- Activity Log currently uses recent task data.
- Office canvas is visual and not yet a full graph editor.

## QA Checklist

### Desktop

- Open `/office`.
- Verify Sidebar route active state.
- Verify Zoom -, 100%, Zoom +, Fit.
- Verify Hide Labels persists after refresh.
- Verify Hide Log persists after refresh.
- Verify Compact Mode persists after refresh.
- Drag Mini Activity Log and refresh.
- Reset Office preferences.
- Send manual task.
- Send WhatsApp task.
- Verify flow animation is sequential.
- Verify Office Scene does not flicker.

### Tablet

- Open `/office`.
- Verify Office Scene remains as scrollable canvas.
- Verify toolbar visible.
- Verify Server Room visible.
- Verify Mini Activity Log visible and draggable.
- Verify connector lines remain visible.

### Mobile

- Open `/office`.
- Verify top sidebar nav remains usable.
- Verify Office Scene canvas is scrollable.
- Verify Mini Activity Log is compact.
- Verify Detail Panel remains usable.
- Verify toolbar buttons remain visible.

## Next Recommended Phase

### Fase 8.20 — Multi-Agent Office Layout Readiness

Recommended goals:

- Define stable slot strategy for more than one real agent.
- Add role-based position mapping.
- Prevent overlapping rooms when multiple agents are registered.
- Prepare connector logic for multiple agents.
- Add focus-agent mode.