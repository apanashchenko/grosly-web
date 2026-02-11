declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void
          renderButton: (
            element: HTMLElement,
            config: GoogleButtonConfig
          ) => void
          prompt: (momentListener?: (notification: GooglePromptNotification) => void) => void
          revoke: (email: string, callback: () => void) => void
        }
      }
    }
  }
}

interface GoogleIdConfig {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  itp_support?: boolean
  use_fedcm_for_prompt?: boolean
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
  getDismissedReason: () => string
}

interface GoogleButtonConfig {
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  width?: number
  locale?: string
}

export interface GoogleCredentialResponse {
  credential: string
  select_by: string
}

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!

export function initializeGoogleSignIn(
  buttonElement: HTMLElement,
  callback: (response: GoogleCredentialResponse) => void,
  locale?: string
) {
  if (!window.google) {
    console.error("Google Identity Services SDK not loaded")
    return
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback,
    auto_select: true,
    cancel_on_tap_outside: false,
    itp_support: true,
    use_fedcm_for_prompt: false,
  })

  // Try One Tap first — auto-signs in without popup if user has a session
  window.google.accounts.id.prompt()

  // Also render the button as fallback
  window.google.accounts.id.renderButton(buttonElement, {
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    width: 320,
    locale,
  })
}
