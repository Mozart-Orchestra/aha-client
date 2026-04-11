# Changelog

## Version 7 - 2026-04-12

This release fixes two noisy genome-hub integration failures on the web app: official role score lookups now resolve gstack canonical names correctly, and custom session roles no longer spam missing `@official` genome requests.

- Fixed official genome alias resolution for gstack roles such as Product Strategist, Engineering Reviewer, QA Commander, Design Architect, Security Officer, Release Engineer, and Retro Analyst.
- Updated the sidebar role score loader so it only probes known official roles instead of firing 404 requests for arbitrary session `roleKey` values.
- Added implementation notes documenting the official-role lookup contract for future UI and marketplace work.

## Version 6 - 2026-04-02

This release makes account recovery much more legible when Google sign-in cannot immediately restore the existing account. Instead of dropping every failure into the same generic fallback, the app now explains the actual recovery state and points users to the right next action.

- Improved Google/email account recovery UX by showing distinct guidance for restore-required, secret-mismatch, and recovery-not-ready states.
- Updated the restore screen so manual restore no longer looks like a failed Google login path.
- Added clearer “existing signed-in device” instructions so users understand when to use Restore Key versus “Add New Device”.
- Added internal walkthrough docs for the auth and account-device journey to support future fixes and reviews.

## Version 5 - 2026-01-19 (Dev-1119 UI Beautification)

This release delivers the P0 phase of the UI beautification initiative, introducing modern shadow systems and enhanced elevation across core components. The implementation establishes a cohesive visual foundation with cross-platform consistency.

- **P0 Beautification Complete**: Enhanced 4 core components with modern shadow systems
  - MainView: Improved shadows and elevation for better visual hierarchy
  - SessionsList: Refined card design with enhanced shadows
  - AgentInput: Polished input panel with modern elevation
  - TeamChatRoom: Beautified chat interface with shadow-enhanced avatars
- **Shared Theme Architecture**: Introduced centralized theme configuration (`shared-theme-config.ts`)
  - Unified design tokens for colors, shadows, spacing, and typography
  - Light and dark theme configurations with platform optimization
  - Cross-project consistency for kanban, server, and CLI components
- **Modern Design System**:
  - Consistent shadow elevation system (iOS shadow + Android elevation)
  - Standardized border radius values (4px, 8px, 12px, 16px, full)
  - Enhanced color palette with proper contrast ratios
  - Improved visual depth perception across all components
- **Documentation**: Comprehensive implementation guides and completion reports
  - Technical implementation guide for developers
  - P0 completion report with architecture decisions
  - QA testing checklist and platform-specific guidelines

## Version 4 - 2025-09-12

This release revolutionizes remote development with Codex integration and Daemon Mode, enabling instant AI assistance from anywhere. Start coding sessions with a single tap while maintaining complete control over your development environment.

- Introduced Codex support for advanced AI-powered code completion and generation capabilities.
- Implemented Daemon Mode as the new default, enabling instant remote session initiation without manual CLI startup.
- Added one-click session launch from mobile devices, automatically connecting to your development machine.
- Added ability to connect anthropic and gpt accounts to account

## Version 3 - 2025-08-29

This update introduces seamless GitHub integration, bringing your developer identity directly into Happy while maintaining our commitment to privacy and security.

- Added GitHub account connection through secure OAuth authentication flow
- Integrated profile synchronization displaying your GitHub avatar, name, and bio
- Implemented encrypted token storage on our backend for additional security protection
- Enhanced settings interface with personalized profile display when connected
- Added one-tap GitHub disconnect functionality with confirmation protection
- Improved account management with clear connection status indicators

## Version 2 - 2025-06-26

This update focuses on seamless device connectivity, visual refinements, and intelligent voice interactions for an enhanced user experience.

- Added QR code authentication for instant and secure device linking across platforms
- Introduced comprehensive dark theme with automatic system preference detection
- Improved voice assistant performance with faster response times and reduced latency
- Added visual indicators for modified files directly in the session list
- Implemented preferred language selection for voice assistant supporting 15+ languages

## Version 1 - 2025-05-12

Welcome to Happy - your secure, encrypted mobile companion for Claude Code. This inaugural release establishes the foundation for private, powerful AI interactions on the go.

- Implemented end-to-end encrypted session management ensuring complete privacy
- Integrated intelligent voice assistant with natural conversation capabilities
- Added experimental file manager with syntax highlighting and tree navigation
- Built seamless real-time synchronization across all your devices
- Established native support for iOS, Android, and responsive web interfaces
