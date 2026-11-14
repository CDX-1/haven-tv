# Haven Toronto — TV display

A full-screen page for the big TV at Haven Toronto. It shows the event title, a turntable whose record spins with the album art on the label, the song currently playing on your Spotify account, and your animated mascot over a custom background.

It's plain HTML/CSS/JS with no build step and no server code. Spotify login runs in the browser using PKCE, so you never need a client secret.

## Run it

```bash
./start.command
```

(Or double-click `start.command` in Finder.) It serves the folder at **http://127.0.0.1:8080/** and opens it.
Use `127.0.0.1`, not `localhost`: Spotify only accepts loopback IP redirect URIs. The page switches to `127.0.0.1` automatically if you open it on `localhost`.

## Connect Spotify (one-time, ~3 minutes)

1. Go to https://developer.spotify.com/dashboard and click **Create app**.
   - **Redirect URI:** `http://127.0.0.1:8080/` (must match exactly, including the trailing slash)
   - **Which API/SDKs:** tick **Web API**
2. Open the app's **Settings** and copy the **Client ID**.
3. On the display, press **S**, paste the Client ID, and click **Connect Spotify**. Log in with the account that will play the music.

Spotify's Development Mode only lets the app owner and users listed under the app's **User Management** sign in, so either create the app with the playing account or add that account there. Spotify has also tightened Development Mode rules recently. If sign-in is refused, check the dashboard to see whether your account type is eligible.

After connecting, the display keeps itself logged in (it refreshes the token automatically) and checks what's playing every 5 seconds. Music can play on any device on that account (phone, laptop, a speaker), and the TV will show it.

## Background & mascot

**Quick way:** press **S** and use *Choose image or video* / *Choose image*. Uploads are stored in that browser only.

**Permanent way:** drop files into `assets/` and set them in `config.js`:

```js
background: "assets/background.jpg",   // or .png/.webp/.gif, or a looping .mp4/.webm
mascot: "assets/mascot.png",           // transparent PNG/GIF/WebP/SVG works best
mascotAnimation: "bounce",             // float | bounce | sway | breathe | wiggle | dance | none
```

Animated GIF/WebP mascots work too: their own animation plays on top of the movement you pick here. With **Move faster while music plays** on, the mascot speeds up whenever a song is playing.

## Headline announcements

Press **H** at any time and type a message such as *Workshop in Auditorium A at 3:00*, then press **Enter**. It shows as a white card with a bell (which rings when the message changes) under the title, with a short flash so people notice it. While you type, the text box sits in the banner's own spot, so it's fine to do this live. To change the message, press **H** again; an empty message plus **Enter** removes it, and so does **Shift + H**. The headline is still there after a reload.

## Quick links

Show links along the bottom of the screen, such as the jam page, Discord or a feedback form. Each one gets a QR code so people can scan it with their phone.

- **Live:** press **S**, go to *Quick links*, click **+ Add link**, and type a label and an address (`itch.io/jam/haven-toronto` is fine without `https://`). Changes show up as you type.
- **Permanent:** set them in `config.js`:

  ```js
  links: [
    { label: "Submit your game", url: "itch.io/jam/haven-toronto" },
    { label: "Join the Discord", url: "discord.gg/yourcode" },
  ],
  ```

Press **L** to hide or show the row. Untick *Show QR codes* for text-only links. The QR codes use a small library from cdnjs. If the TV laptop is offline when the page loads, the links still show, just without QR codes.

## Up next

Under the progress bar, the display shows the next song in your Spotify queue (or autoplay's next pick). It updates when the track changes and every ~20 seconds, so songs you queue mid-song show up shortly after.

## Keys

| Key | Action |
| --- | --- |
| `H` | Edit the headline (type, **Enter** to show, **Esc** to cancel) |
| `Shift` + `H` | Clear the headline |
| `L` | Show/hide quick links |
| `R` | Refresh Spotify now (also the ↻ button bottom-right, or *Refresh* in settings) |
| `S` | Settings panel |
| `F` | Fullscreen |
| `D` | Demo track (to check the look without Spotify) |
| `Esc` | Close settings |

The cursor and the ↻ / ⚙ buttons hide after 3 seconds of no mouse movement. The page also asks the browser to keep the screen awake.

## On the day

- Use Chrome or Edge on the laptop feeding the TV, open the page, then press **F**.
- Turn off the computer's sleep and screensaver as a backup to the wake lock.
- If Wi‑Fi drops, the current song stays on screen and the page reconnects on its own.

## Files

```
index.html   page structure
style.css    look & animations (turntable, mascot, layout)
app.js       Spotify login + polling, settings panel, uploads
config.js    your defaults (title, images, Client ID…)
assets/      put your background + mascot here (mascot.svg is a placeholder)
```
