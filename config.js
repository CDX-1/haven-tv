// Haven Toronto — TV display config.
// Everything here can also be changed live from the on-screen settings panel (press S).
// Settings changed in the panel are saved in this browser and override these defaults.

window.HAVEN_CONFIG = {
  // Spotify app Client ID from https://developer.spotify.com/dashboard (see README.md)
  spotifyClientId: "",

  title: "Haven Toronto",
  subtitle: "Free Game Jam",

  // Shown on the info side when nothing is playing
  idleTitle: "Ambient vibes",
  idleSubtitle: "Make something cozy.",

  // Background: an image (.jpg/.png/.webp/.gif) or a looping video (.mp4/.webm) in /assets.
  // Leave empty for the built-in animated gradient.
  background: "",
  backgroundDim: 0.35, // 0 = no darkening, 1 = black

  // Mascot: a transparent PNG, GIF, WebP or SVG in /assets.
  mascot: "assets/mascot.svg",
  mascotAnimation: "float", // float | bounce | sway | breathe | wiggle | dance | none
  mascotPosition: "bottom-right", // bottom-right | bottom-left | top-right | top-left
  mascotSize: 30, // percent of screen height
  mascotFlip: false, // mirror horizontally
  mascotReact: true, // animate faster while music is playing

  // Quick links along the bottom, each with a QR code people can scan.
  // Example: { label: "Submit your game", url: "itch.io/jam/haven-toronto" }
  links: [],
  linkQr: true,
  showLinks: true,

  // Example: { name: "Sponsor name", logo: "assets/sponsor.png" }
  sponsors: [],

  showClock: true,
  pollSeconds: 5, // how often to ask Spotify what's playing
};
