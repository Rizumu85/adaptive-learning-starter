// Note zones: a picture that carries many notes (hand-written labels with leader lines, printed call-outs) stays one
// image, and each note is a zone on it. Pointing at a note (mouse), tapping it (touch) or reaching it with Tab shows
// that note's typed original and translation in a card, so the reader never matches the picture against a list.
//
// Expected HTML (the reader's generator writes it; see README.md):
//   <div class="note-frame">                         positioned box exactly as large as the picture(s) in it
//     <a href="big.webp" data-image-preview><img …></a>      one picture, or several side by side (a spread)
//     <button type="button" class="note-zone" data-note="ID" aria-label="…" style="left:..%;top:..%;width:..%;height:..%"></button>
//   </div>
//   <… id="ID"> the note's text, once on the page: its element children are cloned into the card </…>
// Optional: a list of the notes with class "note-list" (or data-note-list) is linked both ways with the picture;
// an <a href="#ID"> inside the frame (a lettered marker) is another way into that note.
// The clones keep their classes, so whatever shows and hides languages on the page does the same in the card.
//
// Wide screens: the card floats beside the zone (80 ms after the pointer rests, on keyboard focus, or pinned by a
// tap); left / right arrows step through the notes in reading order; elsewhere the picture still opens its preview.
// Narrow screens (720 px and under, or <body data-note-narrow="…">): nobody has to hit a small target. A tap anywhere
// on the picture opens the nearest note in a sheet at the bottom, with an enlarged view of the place, previous / next,
// swipe left / right, and a count. Inside the shared image preview (assets/image-preview) the zones work the same way.
(() => {
    const frames = [...document.querySelectorAll('.note-frame')];
    if (!frames.length)
        return;
    const labels = /^zh/i.test(document.documentElement.lang)
        ? { previous: '上一条', next: '下一条', whole: '看整图', sheet: '图上的注记' }
        : { previous: 'Previous note', next: 'Next note', whole: 'Whole picture', sheet: 'Notes on the picture' };
    const MIN = 28; // touch on a wide screen: every zone can be hit in an area at least this large (px)
    const SLOP = 6; // touch on a wide screen: how far outside a zone a finger may land
    const DELAY = 80; // how long the pointer rests before the card appears (ms)
    const GAP = 8; // space between the floating card and its zone
    const SPREAD = 2.5; // enlarged view: the note's box grown by this factor
    const MAX_ZOOM = 3; // enlarged view: never more than this many screen px per source px (beyond it only blur grows)
    const narrow = matchMedia(`(max-width:${Number(document.body.dataset.noteNarrow) || 720}px)`);
    const icon = (path) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
    const card = document.createElement('div');
    card.className = 'note-card';
    card.hidden = true;
    card.innerHTML = '<div class="note-grip" aria-hidden="true"></div><div class="note-crop" aria-hidden="true"><div class="note-crop-art"></div></div><div class="note-text"></div>'
        + `<div class="note-nav"><button type="button" class="note-step" data-step="-1" aria-label="${labels.previous}">${icon('m15 18-6-6 6-6')}</button><span class="note-count" aria-live="polite"></span>`
        + `<button type="button" class="note-step" data-step="1" aria-label="${labels.next}">${icon('m9 18 6-6-6-6')}</button><button type="button" class="note-whole">${labels.whole}</button></div>`;
    document.body.append(card);
    const cropBox = card.querySelector('.note-crop');
    const cropArt = card.querySelector('.note-crop-art');
    const textBox = card.querySelector('.note-text');
    const countBox = card.querySelector('.note-count');
    // the shared image preview, when the page has one: a layer of the same zones is laid over the enlarged picture
    const dialog = document.querySelector('dialog.al-image-preview');
    const stage = dialog ? dialog.querySelector('.al-viewer-stage') : null;
    const big = stage ? stage.querySelector('.al-viewer-image') : null;
    const layer = big ? Object.assign(document.createElement('div'), { className: 'note-layer', hidden: true }) : null;
    let current = null; // the zone the card belongs to
    let anchor = null; // what the floating card sits beside (the zone, or a lettered marker)
    let mode = ''; // hover, focus, pinned (tap or arrow key), sheet (narrow screens)
    let hovered = null;
    let timer = 0;
    let pointer = 'mouse';
    let quiet = 0; // scrolling this script caused does not count as the reader scrolling
    let passing = false; // opening the picture's preview on the reader's behalf
    let lit = null; // the list entry being pointed at
    let stuck = null; // the list entry last tapped (touch has no hover)
    const zonesOf = (id, root = document) => [...root.querySelectorAll(`.note-zone[data-note="${CSS.escape(id)}"]`)];
    const rootOf = (zone) => zone.closest('.note-frame, .note-layer');
    // the notes of one picture in reading order (the order of the zones in the page)
    const notesOf = (root) => [...new Set([...root.querySelectorAll('.note-zone')].map((zone) => zone.dataset.note))];
    const markOf = (target) => {
        const mark = target instanceof Element ? target.closest('a[href^="#"]') : null;
        const frame = mark ? mark.closest('.note-frame') : null;
        const zone = frame ? zonesOf(decodeURIComponent(mark.getAttribute('href').slice(1)), frame)[0] : null;
        return zone ? { mark, zone } : null;
    };
    const ceiling = () => {
        // the card stays below a bar fixed to the top of the screen
        const bar = current && rootOf(current) === layer ? dialog.querySelector('.al-viewer-top') : document.querySelector('[data-note-ceiling], .rc-bar');
        return Math.max(GAP, bar ? bar.getBoundingClientRect().bottom + GAP : 0);
    };
    function place() {
        if (!current || card.hidden || mode === 'sheet')
            return;
        let zone = (anchor || current).getBoundingClientRect();
        if (anchor && anchor !== current) {
            // beside a marker: the marker sits next to its own note, so keep clear of both
            const own = current.getBoundingClientRect();
            const gap = Math.hypot(Math.max(own.left - zone.right, zone.left - own.right, 0), Math.max(own.top - zone.bottom, zone.top - own.bottom, 0));
            if (gap <= 120)
                zone = new DOMRect(Math.min(zone.left, own.left), Math.min(zone.top, own.top), Math.max(zone.right, own.right) - Math.min(zone.left, own.left), Math.max(zone.bottom, own.bottom) - Math.min(zone.top, own.top));
        }
        const width = document.documentElement.clientWidth;
        const height = window.innerHeight;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        const top0 = ceiling();
        const clampX = (x) => Math.min(Math.max(x, GAP), Math.max(GAP, width - GAP - w));
        const clampY = (y) => Math.min(Math.max(y, top0), Math.max(top0, height - GAP - h));
        const others = [...rootOf(current).querySelectorAll('.note-zone')].filter((other) => other.dataset.note !== current.dataset.note).map((other) => other.getBoundingClientRect());
        // how much of the other notes the card would hide at this place
        const hidden = (x, y) => others.reduce((sum, r) => sum + Math.max(0, Math.min(r.right, x + w) - Math.max(r.left, x)) * Math.max(0, Math.min(r.bottom, y + h) - Math.max(r.top, y)), 0);
        // below, above, right, left: the first that hides no other note; failing that the one that hides least.
        // A place only counts when the card fits there without leaving the screen or covering its own note.
        const places = [
            [clampX(zone.left + zone.width / 2 - w / 2), zone.bottom + GAP],
            [clampX(zone.left + zone.width / 2 - w / 2), zone.top - GAP - h],
            [zone.right + GAP, clampY(zone.top + zone.height / 2 - h / 2)],
            [zone.left - GAP - w, clampY(zone.top + zone.height / 2 - h / 2)],
        ].filter(([x, y]) => x >= GAP - 0.5 && x + w <= width - GAP + 0.5 && y >= top0 - 0.5 && y + h <= height - GAP + 0.5);
        let best = null;
        let least = Infinity;
        for (const [x, y] of places) {
            const area = hidden(x, y);
            if (area < least - 0.5) {
                best = [x, y];
                least = area;
            }
        }
        // nowhere fits (a very small window): keep it on screen under or over the note, whichever has more room
        if (!best)
            best = [clampX(zone.left + zone.width / 2 - w / 2), clampY(zone.top - top0 > height - zone.bottom ? zone.top - GAP - h : zone.bottom + GAP)];
        card.style.transform = `translate(${Math.round(best[0])}px,${Math.round(best[1])}px)`;
    }
    // the enlarged view in the sheet: the note's box grown SPREAD times, widened to the sheet's shape, kept inside the picture
    function crop(zone) {
        const root = rootOf(zone);
        const f = root.getBoundingClientRect();
        const z = zone.getBoundingClientRect();
        const images = root === layer ? [big] : [...root.querySelectorAll('img')];
        const natural = images.reduce((sum, image) => sum + image.naturalWidth, 0) || f.width;
        const W = cropBox.clientWidth;
        const H = cropBox.clientHeight;
        let rw = z.width * SPREAD;
        let rh = z.height * SPREAD;
        if (rw / rh < W / H)
            rw = rh * W / H;
        else
            rh = rw * H / W;
        // a small label is not blown up into a blur: the view takes at least this much of the picture
        const least = W / MAX_ZOOM * f.width / natural;
        if (rw < least) {
            rw = least;
            rh = rw * H / W;
        }
        const fit = Math.min(1, f.width / rw, f.height / rh);
        rw *= fit;
        rh *= fit;
        const rx = Math.min(Math.max(z.left - f.left + z.width / 2 - rw / 2, 0), f.width - rw);
        const ry = Math.min(Math.max(z.top - f.top + z.height / 2 - rh / 2, 0), f.height - rh);
        const k = Math.min(W / rw, H / rh);
        cropArt.style.width = `${f.width * k}px`;
        cropArt.style.height = `${f.height * k}px`;
        cropArt.style.left = `${(W - rw * k) / 2 - rx * k}px`;
        cropArt.style.top = `${(H - rh * k) / 2 - ry * k}px`;
        const key = images.map((image) => image.currentSrc || image.src).join(' ');
        if (cropArt.dataset.key !== key) {
            cropArt.dataset.key = key;
            let offset = 0;
            cropArt.replaceChildren(...images.map((image) => {
                const copy = new Image();
                copy.src = image.currentSrc || image.src;
                copy.alt = '';
                copy.draggable = false;
                copy.style.left = `${offset / natural * 100}%`;
                copy.style.width = `${image.naturalWidth / natural * 100}%`;
                offset += image.naturalWidth;
                return copy;
            }), Object.assign(document.createElement('span'), { className: 'note-crop-mark' }));
        }
        const mark = cropArt.querySelector('.note-crop-mark');
        mark.style.left = `${(z.left - f.left) / f.width * 100}%`;
        mark.style.top = `${(z.top - f.top) / f.height * 100}%`;
        mark.style.width = `${z.width / f.width * 100}%`;
        mark.style.height = `${z.height / f.height * 100}%`;
    }
    // with the sheet open, the note that is lit on the picture stays visible above it
    function reveal(zone) {
        if (rootOf(zone) === layer) {
            // in the preview the picture cannot scroll: the stage gives up the sheet's height and the viewer refits
            stage.style.bottom = `${card.offsetHeight}px`;
            return;
        }
        const frame = rootOf(zone).getBoundingClientRect();
        const z = zone.getBoundingClientRect();
        const top = ceiling();
        const free = window.innerHeight - card.offsetHeight - GAP;
        const whole = frame.height <= free - top;
        if (whole ? frame.top >= top - 1 && frame.bottom <= free + 1 : z.top >= top && z.bottom <= free)
            return;
        const target = whole ? frame : z;
        quiet = performance.now() + 900;
        window.scrollBy({ top: target.top + target.height / 2 - (top + free) / 2 });
    }
    function unmark() {
        for (const zone of zonesOf(current.dataset.note))
            zone.classList.remove('is-on');
        const entry = document.getElementById(current.dataset.note);
        if (entry)
            entry.classList.remove('note-on');
    }
    function hide() {
        clearTimeout(timer);
        if (!current)
            return;
        unmark();
        if (mode === 'sheet') {
            document.body.style.paddingBottom = '';
            if (stage)
                stage.style.bottom = '';
        }
        current = null;
        anchor = null;
        mode = '';
        card.hidden = true;
        card.classList.remove('is-sheet');
        textBox.replaceChildren();
        // back out of the preview's top layer
        if (card.parentElement !== document.body)
            document.body.append(card);
    }
    function show(zone, how, beside) {
        clearTimeout(timer);
        if (current === zone && mode === how && (beside || zone) === anchor)
            return;
        const entry = document.getElementById(zone.dataset.note);
        if (!entry)
            return;
        if (current)
            unmark();
        current = zone;
        anchor = beside || zone;
        mode = how;
        textBox.replaceChildren(...[...entry.children].map((node) => {
            const copy = node.cloneNode(true);
            copy.removeAttribute('id');
            copy.querySelectorAll('[id]').forEach((inner) => inner.removeAttribute('id'));
            return copy;
        }));
        for (const same of zonesOf(zone.dataset.note))
            same.classList.add('is-on');
        entry.classList.add('note-on');
        const root = rootOf(zone);
        const notes = notesOf(root);
        const at = notes.indexOf(zone.dataset.note);
        countBox.textContent = `${at + 1} / ${notes.length}`;
        card.querySelector('[data-step="-1"]').disabled = at === 0;
        card.querySelector('[data-step="1"]').disabled = at === notes.length - 1;
        const sheet = how === 'sheet';
        card.classList.toggle('is-sheet', sheet);
        // the floating card repeats what the zone's own label already says to a screen reader; the sheet has buttons
        if (sheet) {
            card.removeAttribute('aria-hidden');
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-label', labels.sheet);
            card.style.transform = '';
        }
        else {
            card.setAttribute('aria-hidden', 'true');
            card.removeAttribute('role');
            card.removeAttribute('aria-label');
        }
        // the preview is a modal dialog in the top layer: the card has to live inside it to be seen
        const host = root === layer ? dialog : document.body;
        if (card.parentElement !== host)
            host.append(card);
        card.hidden = false;
        if (sheet) {
            crop(zone);
            // a picture at the very end of the page can still scroll up above the sheet
            if (root !== layer)
                document.body.style.paddingBottom = `${card.offsetHeight}px`;
            reveal(zone);
        }
        else {
            place();
        }
    }
    // to the previous / next note in reading order
    function step(delta) {
        if (!current)
            return;
        const root = rootOf(current);
        const notes = notesOf(root);
        const zone = zonesOf(notes[notes.indexOf(current.dataset.note) + delta] || '', root)[0];
        if (!zone)
            return;
        if (mode === 'sheet') {
            show(zone, 'sheet');
        }
        else if (document.activeElement instanceof Element && document.activeElement.matches('.note-zone')) {
            zone.focus();
            show(zone, 'focus');
        }
        else {
            const r = zone.getBoundingClientRect();
            if (root !== layer && (r.top < ceiling() || r.bottom > window.innerHeight - GAP)) {
                quiet = performance.now() + 900;
                zone.scrollIntoView({ block: 'center' });
            }
            show(zone, 'pinned');
        }
    }
    // Which zone a point belongs to. A zone smaller than `min` counts as that large; when several are within
    // `reach`, the nearest edge wins, then the nearest centre. reach = Infinity: the nearest zone wherever it is.
    function pick(root, x, y, min, reach) {
        let best = null;
        let bestEdge = Infinity;
        let bestCentre = Infinity;
        for (const zone of root.querySelectorAll('.note-zone')) {
            const r = zone.getBoundingClientRect();
            const px = Math.max(0, (min - r.width) / 2);
            const py = Math.max(0, (min - r.height) / 2);
            const edge = Math.hypot(Math.max(r.left - px - x, 0, x - r.right - px), Math.max(r.top - py - y, 0, y - r.bottom - py));
            if (edge > reach)
                continue;
            const centre = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
            if (edge < bestEdge - 0.5 || (edge < bestEdge + 0.5 && centre < bestCentre)) {
                best = zone;
                bestEdge = edge;
                bestCentre = centre;
            }
        }
        return best;
    }
    function leave() {
        hovered = null;
        clearTimeout(timer);
        if (mode === 'hover')
            hide();
    }
    const swallow = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };
    let down = null;
    document.addEventListener('pointerdown', (event) => {
        pointer = event.pointerType || 'mouse';
        down = { x: event.clientX, y: event.clientY };
    }, true);
    // surface receives the pointer; root holds the zones (the same element on the page, the stage and its layer in the preview)
    function bind(surface, root) {
        const inPreview = root === layer;
        surface.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse' || narrow.matches)
                return;
            // a lettered marker is another way in: pointing at it is pointing at its note
            const marked = inPreview ? null : markOf(event.target);
            const zone = marked ? marked.zone : pick(root, event.clientX, event.clientY, 0, 0);
            const place = zone && (marked ? marked.mark : zone);
            if (place === hovered)
                return;
            leave();
            hovered = place;
            if (zone)
                timer = setTimeout(() => show(zone, 'hover', place), DELAY);
        });
        surface.addEventListener('pointerleave', (event) => {
            if (event.pointerType === 'mouse')
                leave();
        });
        // in the capture phase, ahead of the picture's own click (the preview)
        surface.addEventListener('click', (event) => {
            if (passing || !root.querySelector('.note-zone'))
                return;
            // the end of a drag in the preview (panning, paging, pulling down) is not a tap
            if (inPreview && event.detail !== 0 && down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8)
                return;
            const target = event.target instanceof Element ? event.target : null;
            const marked = inPreview ? null : markOf(target);
            const own = target ? target.closest('.note-zone') : null;
            const touch = pointer !== 'mouse';
            if (narrow.matches) {
                // narrow: a tap anywhere on the picture opens the nearest note (Enter on the picture link still opens the preview)
                if (event.detail === 0 && !own && !marked)
                    return;
                const zone = (marked && marked.zone) || own || pick(root, event.clientX, event.clientY, 0, Infinity);
                if (!zone)
                    return;
                swallow(event);
                show(zone, 'sheet');
                return;
            }
            if (event.detail === 0) {
                // Enter or Space on a zone: focus already showed the card; once more closes it, once more shows it
                if (!own)
                    return;
                swallow(event);
                if (current === own)
                    hide();
                else
                    show(own, 'pinned');
                return;
            }
            if (marked) {
                // a mouse click on a marker still follows its link; a tap on it opens the card
                if (!touch)
                    return;
                swallow(event);
                if (current === marked.zone && anchor === marked.mark)
                    hide();
                else
                    show(marked.zone, 'pinned', marked.mark);
                return;
            }
            const zone = pick(root, event.clientX, event.clientY, touch ? MIN : 0, touch ? SLOP : 0);
            if (zone) {
                swallow(event);
                if (!touch)
                    show(zone, 'hover');
                else if (current === zone)
                    hide();
                else
                    show(zone, 'pinned');
            }
            else if (mode === 'pinned' && current && rootOf(current) === root) {
                // with a card pinned, a tap elsewhere on the picture only closes it; it does not also open the preview
                swallow(event);
                hide();
            }
        }, true);
        if (inPreview)
            return;
        surface.addEventListener('focusin', (event) => {
            if (narrow.matches || !(event.target instanceof Element) || !event.target.matches(':focus-visible'))
                return;
            const marked = markOf(event.target);
            const zone = marked ? marked.zone : event.target.closest('.note-zone');
            if (zone)
                show(zone, 'focus', marked ? marked.mark : zone);
        });
        surface.addEventListener('focusout', () => {
            if (mode === 'focus')
                hide();
        });
    }
    frames.forEach((frame) => bind(frame, frame));
    if (layer) {
        layer.setAttribute('aria-hidden', 'true');
        stage.append(layer);
        let following = 0;
        const follow = () => {
            // the picture's box on screen already includes the viewer's zoom and its opening, paging and pull-down motion
            const box = big.getBoundingClientRect();
            const origin = stage.getBoundingClientRect();
            layer.style.left = `${box.left - origin.left}px`;
            layer.style.top = `${box.top - origin.top}px`;
            layer.style.width = `${box.width}px`;
            layer.style.height = `${box.height}px`;
            if (current && rootOf(current) === layer)
                place();
            following = requestAnimationFrame(follow);
        };
        const sync = () => {
            cancelAnimationFrame(following);
            if (current && rootOf(current) === layer)
                hide();
            const link = big.getAttribute('src') ? [...document.querySelectorAll('.note-frame a[data-image-preview]')].find((a) => a.href === big.src) : null;
            const picture = link ? link.querySelector('img') : null;
            const zones = [];
            if (picture) {
                // the zones that lie on this picture (one half of a spread has its own), measured on the page
                const p = picture.getBoundingClientRect();
                for (const zone of link.closest('.note-frame').querySelectorAll('.note-zone')) {
                    const z = zone.getBoundingClientRect();
                    const cx = z.left + z.width / 2;
                    const cy = z.top + z.height / 2;
                    if (!p.width || cx < p.left || cx > p.right || cy < p.top || cy > p.bottom)
                        continue;
                    const copy = document.createElement('span');
                    copy.className = 'note-zone';
                    copy.dataset.note = zone.dataset.note;
                    copy.style.cssText = `left:${(z.left - p.left) / p.width * 100}%;top:${(z.top - p.top) / p.height * 100}%;width:${z.width / p.width * 100}%;height:${z.height / p.height * 100}%`;
                    zones.push(copy);
                }
            }
            layer.replaceChildren(...zones);
            layer.hidden = !zones.length;
            if (zones.length)
                follow();
        };
        new MutationObserver(sync).observe(big, { attributes: true, attributeFilter: ['src'] });
        dialog.addEventListener('close', () => {
            if (current && rootOf(current) === layer)
                hide();
        });
        bind(stage, layer);
    }
    // the sheet: buttons step and open the whole picture; a swipe left or right steps, a swipe down closes
    card.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest('button') : null;
        if (!button || !current)
            return;
        if (button.dataset.step) {
            step(Number(button.dataset.step));
            return;
        }
        // whole picture: the picture's own preview (for a spread, the half this note is on)
        const z = current.getBoundingClientRect();
        const links = [...rootOf(current).querySelectorAll('a[data-image-preview]')];
        const link = links.find((a) => z.left + z.width / 2 <= a.getBoundingClientRect().right) || links[0];
        hide();
        passing = true;
        if (link)
            link.click();
        passing = false;
    });
    let drag = null;
    card.addEventListener('pointerdown', (event) => {
        drag = mode === 'sheet' ? { x: event.clientX, y: event.clientY } : null;
    });
    card.addEventListener('pointerup', (event) => {
        if (!drag)
            return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        drag = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5)
            step(dx < 0 ? 1 : -1);
        else if (dy > 50 && dy > Math.abs(dx) * 1.5)
            hide();
    });
    card.addEventListener('pointercancel', () => { drag = null; });
    // the list and the picture are linked both ways: point at, focus or tap an entry and its place lights up
    function light(id) {
        if (lit === id)
            return;
        if (lit)
            for (const zone of zonesOf(lit))
                zone.classList.remove('is-lit');
        lit = id;
        if (id)
            for (const zone of zonesOf(id))
                zone.classList.add('is-lit');
    }
    const entryOf = (list, target) => {
        for (let el = target instanceof Element ? target : null; el && el !== list; el = el.parentElement)
            if (el.id && zonesOf(el.id).length)
                return el.id;
        return null;
    };
    for (const list of document.querySelectorAll('.note-list, [data-note-list]')) {
        list.addEventListener('pointerover', (event) => light(entryOf(list, event.target) || stuck));
        list.addEventListener('pointerleave', () => light(stuck));
        list.addEventListener('focusin', (event) => light(entryOf(list, event.target) || stuck));
        list.addEventListener('focusout', () => light(stuck));
        list.addEventListener('click', (event) => {
            stuck = entryOf(list, event.target);
            light(stuck);
        });
    }
    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target && card.contains(target))
            return;
        if (mode === 'pinned' || mode === 'sheet')
            hide();
        if (!(target && target.closest('.note-list, [data-note-list]'))) {
            stuck = null;
            light(null);
        }
    });
    // ahead of the preview's own keys: with a card open, Escape closes the card and the arrows step through the notes
    document.addEventListener('keydown', (event) => {
        if (!current || event.altKey || event.ctrlKey || event.metaKey)
            return;
        if (event.key === 'Escape') {
            swallow(event);
            hide();
        }
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            swallow(event);
            step(event.key === 'ArrowRight' ? 1 : -1);
        }
    }, true);
    // scrolling closes the floating card; scrolling caused by keyboard focus only moves it; under the sheet the page scrolls freely
    window.addEventListener('scroll', () => {
        hovered = null;
        if (mode === 'sheet')
            return;
        if (mode === 'focus' || performance.now() < quiet)
            place();
        else
            hide();
    }, { capture: true, passive: true });
    // a change of width re-lays the page; a change of height alone is the address bar of a phone sliding away
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth === lastWidth) {
            place();
            return;
        }
        lastWidth = window.innerWidth;
        hide();
    });
    // a change of view (which languages show, readings on or off) changes the card's size
    new MutationObserver(() => requestAnimationFrame(place)).observe(document.body, { attributes: true });
})();
