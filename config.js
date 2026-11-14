// Haven Toronto — TV display config.
// Everything here can also be changed live from the on-screen settings panel (press S).
// Settings changed in the panel are saved in this browser and override these defaults.

window.HAVEN_CONFIG = {
  // Spotify app Client ID from https://developer.spotify.com/dashboard (see README.md)
  spotifyClientId: "bf3cf86335e848418c81d9409ade45ac",

  title: "Haven Toronto",
  subtitle: "Free Game Jam",

  // Shown on the info side when nothing is playing
  idleTitle: "Ambient vibes",
  idleSubtitle: "Make something cozy.",

  // Background: an image (.jpg/.png/.webp/.gif) or a looping video (.mp4/.webm) in /assets.
  // Leave empty for the built-in animated gradient.
  background: "assets/background.png",
  backgroundDim: 0.35, // 0 = no darkening, 1 = black

  // Mascot: a transparent PNG, GIF, WebP or SVG in /assets.
  mascot: "assets/mascot.png",
  mascotAnimation: "dance", // float | bounce | sway | breathe | wiggle | dance | none
  mascotPosition: "bottom-right", // bottom-right | bottom-left | top-right | top-left
  mascotSize: 30, // percent of screen height
  mascotFlip: true, // mirror horizontally
  mascotReact: true, // animate faster while music is playing

  // Quick links along the bottom, each with a QR code people can scan.
  // Example: { label: "Submit your game", url: "itch.io/jam/haven-toronto" }
  links: [
    { label: "code of conduct", url: "hack.club/conduct" },
    { label: "song request", url: "https://tinyurl.com/havento-song" },
  ],
  linkQr: true,
  showLinks: true,

  // Example: { name: "Sponsor name", logo: "assets/sponsor.png" }
  sponsors: [
    { name: "Hack Club", logo: "https://assets.hackclub.com/flag-standalone.png" },
    { name: "Centennial College", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJmCzgClootjdm_cnJVbAtaxniB5PRP1pmfhTmYa2gXA&s=10" },
    { name: "Chatforce", logo: "https://chatforce.com/assets/logos/icon%20+%20text%20(light)/icon_text_light_svg.svg" },
    { name: "Shopify", logo: "https://cdn-icons-png.flaticon.com/256/5968/5968919.png" },
    { name: "Algoverse AI", logo: "https://algoverseairesearch.org/logo.png" },
    { name: "Puzzle Cats", logo: "https://i.ibb.co/Q3KR6yH2/pclogo-1.png" },
    { name: ".xyz", logo: "https://gen.xyz/wp-content/themes/xyz/images/our-tlds/xyz.png" },
    { name: "Photon Engine", logo: "https://i.ibb.co/8nYzFB6h/photon.png" },
    { name: "Kitten Cup Studios", logo: "https://i.ibb.co/CKjCj5Dm/027f5-997a94-0f0d02bc7ceb490d8e4c7b4bfdc40047mv2.png" },
  ],
  sponsorColumns: "3", // auto | 1-8
  sponsorCardSize: 100, // percent

  showClock: true,
  pollSeconds: 5, // how often to ask Spotify what's playing
};
