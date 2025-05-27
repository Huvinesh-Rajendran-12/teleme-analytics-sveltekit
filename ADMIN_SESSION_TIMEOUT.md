# Admin Session Timeout System

This document describes the session timeout system implemented for the admin dashboard to enhance security and prevent unauthorized access.

## Overview

The admin session timeout system automatically logs out administrators after a period of inactivity, helping to protect sensitive data and prevent unauthorized access when administrators leave their workstations unattended.

## Features

- **Automatic Session Timeout**: Sessions expire after 30 minutes of inactivity
- **Warning System**: Users receive a warning 5 minutes before session expires
- **Activity Tracking**: User interactions extend the session automatically
- **Graceful Logout**: Clean session termination with proper token cleanup
- **Real-time Updates**: Live countdown in warning dialog
- **Session Extension**: Users can manually extend their session

## Configuration

The timeout settings are configured in `src/lib/config/admin.ts`:

```typescript
export const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  TIMEOUT_DURATION: 30 * 60 * 1000,
  // Warning time before logout (5 minutes before timeout)
  WARNING_DURATION: 5 * 60 * 1000,
  // Check interval for session activity (1 minute)
  CHECK_INTERVAL: 60 * 1000,
  // Local storage keys
  LAST_ACTIVITY_KEY: 'admin_last_activity',
  WARNING_SHOWN_KEY: 'admin_warning_shown'
};
```

## Components

### 1. Session Manager (`src/lib/utils/sessionManager.ts`)

The core session management utility that handles:
- Activity tracking across multiple user interactions
- Session expiration detection
- Warning notifications
- Automatic logout functionality

Key methods:
- `init(callback)`: Initialize session management
- `updateLastActivity()`: Update activity timestamp
- `isSessionExpired()`: Check if session has expired
- `extendSession()`: Manually extend session
- `logout()`: Clean logout with token removal

### 2. Authentication Integration (`src/lib/utils/auth.ts`)

Enhanced authentication utilities with session support:
- `updateUserActivity()`: Track user activity
- `getSessionStatus()`: Get current session state
- `isAdminLoggedIn()`: Validate both token and session

### 3. Session Warning Modal (`src/lib/components/admin/SessionWarningModal.svelte`)

Interactive warning dialog that:
- Displays time remaining until logout
- Provides options to extend session or logout
- Updates countdown in real-time
- Supports keyboard shortcuts (Escape to extend)

### 4. Admin Layout Integration (`src/lib/components/admin/AdminLayout.svelte`)

Main layout component with session management:
- Initializes session manager on mount
- Handles warning callbacks
- Manages session extension and logout
- Cleans up resources on unmount

## Activity Tracking

The system tracks user activity through various events:
- Mouse movements and clicks
- Keyboard input
- Scroll events
- Touch interactions
- API calls and page navigation

Activity automatically extends the session, resetting the timeout timer.

## User Experience

### Normal Operation
1. User logs in and session timer starts
2. User activity continuously extends the session
3. Session remains active during normal usage

### Warning Phase
1. When 5 minutes remain, warning modal appears
2. Real-time countdown shows time remaining
3. User can choose to "Stay Logged In" or "Logout Now"
4. Any activity during warning extends the session

### Timeout
1. If no action is taken, automatic logout occurs
2. User is redirected to login page
3. All session data is cleared
4. User must re-authenticate to continue

## Security Benefits

- **Prevents Unauthorized Access**: Unattended sessions are automatically terminated
- **Reduces Attack Surface**: Limits exposure time of active sessions
- **Audit Trail**: Session activities are logged for security monitoring
- **Token Management**: Proper cleanup prevents token reuse

## Development Tools

### Session Status Indicator (Development Only)

In development mode, a status indicator appears showing:
- Current session status (Active/Warning/Expired)
- Time remaining until expiration
- Last activity timestamp
- Warning state

This helps developers monitor session behavior during testing.

## Implementation Notes

### Server-Side Token Expiration

The JWT tokens are set to expire after 8 hours on the server side (`src/routes/api/admin/auth/+server.ts`). This provides a hard limit even if client-side session management fails.

### Browser Storage

Session data is stored in localStorage:
- `admin_session_token`: JWT authentication token
- `admin_last_activity`: Timestamp of last user activity
- `admin_warning_shown`: Flag to prevent duplicate warnings

### Error Handling

The system gracefully handles:
- Network failures during API calls
- Browser tab/window focus changes
- Storage quota exceeded
- Concurrent session management

## Customization

To modify timeout behavior:

1. **Change Timeout Duration**: Update `TIMEOUT_DURATION` in session config
2. **Adjust Warning Time**: Modify `WARNING_DURATION` for earlier/later warnings
3. **Activity Events**: Add/remove tracked events in session manager
4. **UI Customization**: Modify warning modal appearance and behavior

## Testing

To test the session timeout system:

1. **Enable Debug Mode**: Set environment to development
2. **Reduce Timeout**: Temporarily lower timeout values for testing
3. **Monitor Logs**: Check browser console for session events
4. **Test Scenarios**:
   - Normal activity extension
   - Warning dialog functionality
   - Automatic logout behavior
   - Manual session extension

## Troubleshooting

### Common Issues

1. **Session Not Extending**: Check if activity events are being tracked
2. **Warning Not Showing**: Verify callback registration in AdminLayout
3. **Immediate Logout**: Check for clock synchronization issues
4. **Storage Errors**: Ensure localStorage is available and has space

### Debug Information

Enable debug logging by setting development environment. Session events will be logged with `[SESSION]` prefix.

## Browser Compatibility

The session timeout system is compatible with:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

Uses standard web APIs: localStorage, setTimeout, addEventListener.