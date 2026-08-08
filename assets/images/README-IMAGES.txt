IMAGE SLOTS — what goes here
============================

Everything in hero/, services/ and about/ is a PLACEHOLDER .svg.
The site does not currently reference them: the design uses the 3D
cinematic and the liquid-glass cards instead of photography, so it
looks finished without a single photo. These slots exist for when
you want to add real imagery.

WHEN YOU ADD PHOTOS:

  1. Use a real, LICENSED photo. Unsplash and Pexels are fine to
     start with. Do NOT use an AI-generated image of a famous Indian
     monument — Indian audiences will spot the wrong number of domes
     immediately, and it will cost you credibility.

  2. Export as .webp (or .avif). Not .jpg, not .png.

  3. Size them properly. Do not ship a 4000px photo and let the
     browser shrink it:
         hero/india-hero.webp          1920 x 1080
         hero/india-hero-tablet.webp   1280 x 800
         hero/india-hero-mobile.webp    800 x 1000
         services/*.webp                800 x 500
         about/about-brahmnmitra.webp  1000 x 700

  4. In the HTML, ALWAYS give width and height attributes. Without
     them the page jumps as each image loads (this is "layout
     shift", and it is a Lighthouse penalty).

  5. Everything below the fold gets  loading="lazy".

  6. Every photo needs real alt text describing what is IN it —
     not "image" and not the filename.

Delete the placeholder .svg files once you replace them.


--------------------------------------------------------------
ACTIVATING THE HERO PHOTO (new)
--------------------------------------------------------------

The hero now has a photo slot wired in, OFF by default. To turn
it on:

  1. Drop three .webp files into this hero/ folder:
        india-hero.webp          1920 x 1080  (desktop)
        india-hero-tablet.webp   1280 x  800
        india-hero-mobile.webp    800 x 1000  (portrait crop)

  2. In index.html, find:   <div class="stage" id="top">
     Change it to:          <div class="stage has-photo" id="top">

That's the whole switch. The photo appears BEHIND the night-sky
gradient, which becomes a translucent navy wash so the white "BRAHMNMITRA"
headline stays readable (still passes WCAG AA over the photo).

If a file is missing, the layer hides itself automatically and the
plain gradient shows — nothing breaks.

Pick a photo that reads well DARK and doesn't fight the text: a fort
or palace at golden hour, a wide landscape, not a busy street scene.
