# Agent Office Scene UX Review

## Current Scope

Agent Office is a visual workspace layer for the Personal Multi-Agent System.  
Dashboard remains the operational control center.  
Agent Office focuses on visualizing real-time agent activity.

## Current Features

- Real registered agents only
- Living isometric office scene
- Server room visual
- WhatsApp source card
- Manual console card
- Skill shelf
- Output board
- Active task bubble
- Mini activity log
- Detail interaction panel
- Toolbar controls
- Legend
- Theme support
- Responsive fallback layout

## Current Interaction Rules

- Click any office element to inspect details.
- Click empty scene area to close the detail panel.
- Press ESC to close the detail panel.
- Show or hide labels using the mini toolbar.
- Show or hide activity log using the mini toolbar.
- Use compact mode to reduce scene overlay density.

## Visual Meaning

- Green: idle or completed
- Orange: processing
- Red: error
- Purple: skill
- Cyan: server
- Blue: manual source

## Known Intentional Limitations

- No full 3D scene yet.
- No drag-and-drop office layout yet.
- No custom furniture editor yet.
- Only registered backend agents are displayed.
- Activity log currently uses recentTasks data.

## Next Possible Improvements

1. Persist Office toolbar preferences.
2. Add agent focus mode.
3. Add office detail drawer pin mode.
4. Add task path animation.
5. Add asset-based isometric background.

6. Test checklist