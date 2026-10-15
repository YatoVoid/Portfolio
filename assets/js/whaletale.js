// WhaleTale site behaviour

// Lock viewport height to the current window size, but only re-lock it when
// the window WIDTH changes (real resize/zoom) — not on mobile browsers
// hiding/showing their toolbar mid-scroll, which changes height only and
// must never shift ocean elements (see "fix toolbar-hide snap").
(function() {
	let lastWidth = window.innerWidth;
	function lockWinH() {
		document.documentElement.style.setProperty('--win-h', window.innerHeight + 'px');
	}
	lockWinH();
	window.addEventListener('resize', () => {
		if (window.innerWidth === lastWidth) return;
		lastWidth = window.innerWidth;
		lockWinH();
	}, { passive: true });
})();

// Persistent clock — survives page navigations AND browser refreshes
(function() {
	const KEY = 'wt_t0';
	const stored = +localStorage.getItem(KEY) || 0;
	// Reset after 24 h so modulo arithmetic stays sane
	if (!stored || Date.now() - stored > 86400000) localStorage.setItem(KEY, Date.now());
})();
const _elapsed = (Date.now() - +localStorage.getItem('wt_t0')) / 1000; // seconds

// language
function setLang(lang) {
	document.querySelectorAll('[data-en][data-ru]').forEach(el => {
		const val = el.getAttribute('data-' + lang);
		if (val !== null) el.textContent = val;
	});
	document.documentElement.lang = lang;
	const seg = document.querySelector('.lang');
	if (seg) {
		seg.dataset.lang = lang;
		seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.l === lang));
	}
	try { localStorage.setItem('language', lang); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
	// Keep copyright year current without touching HTML each year
	const yr = new Date().getFullYear().toString();
	document.querySelectorAll('.copy').forEach(el => {
		['data-en', 'data-ru'].forEach(a => {
			if (el.hasAttribute(a)) el.setAttribute(a, el.getAttribute(a).replace(/\d{4}/, yr));
		});
	});

	let lang = 'ru';
	try { lang = localStorage.getItem('language') || 'ru'; } catch (e) {}
	setLang(lang);

	// navbar shrink on scroll
	const nav = document.querySelector('.nav');
	const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 30); };
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });

	// mobile drawer
	const burger = document.querySelector('.burger');
	const drawer = document.querySelector('.drawer');
	if (burger && drawer) {
		const toggle = () => { burger.classList.toggle('open'); drawer.classList.toggle('open'); };
		burger.addEventListener('click', toggle);
		drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
			burger.classList.remove('open'); drawer.classList.remove('open');
		}));
	}

	// scroll reveal
	const items = document.querySelectorAll('.reveal');
	if ('IntersectionObserver' in window) {
		const io = new IntersectionObserver((entries) => {
			entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
		}, { threshold: 0.12 });
		items.forEach(i => io.observe(i));
	} else {
		items.forEach(i => i.classList.add('in'));
	}

	// Offset slow ambient elements so they appear already in progress on page load
	const rays = document.querySelector('.ocean-fx .rays');
	if (rays) rays.style.animationDelay = `-${_elapsed % 16}s`;

	// build bubbles — same seeds across all pages so positions never jump on navigation
	const bubbles = document.querySelector('.bubbles');
	if (bubbles) {
		const SEED_KEY = 'wt_bseeds';
		const COUNT = 14;
		let seeds = null;
		try { seeds = JSON.parse(localStorage.getItem(SEED_KEY)); } catch(e) {}
		if (!seeds || seeds.length !== COUNT) {
			seeds = Array.from({length: COUNT}, () => ({
				s:    6  + Math.random() * 22,
				left: Math.random() * 100,
				d:    10 + Math.random() * 14,
				bd:   Math.random() * 12,
				x:    Math.random() * 80 - 40
			}));
			try { localStorage.setItem(SEED_KEY, JSON.stringify(seeds)); } catch(e) {}
		}
		seeds.forEach(seed => {
			const b = document.createElement('span');
			b.style.setProperty('--s',     seed.s    + 'px');
			b.style.left =                 seed.left + '%';
			b.style.setProperty('--d',     seed.d    + 's');
			b.style.setProperty('--delay', (seed.bd - (_elapsed % seed.d)) + 's');
			b.style.setProperty('--x',     seed.x    + 'px');
			bubbles.appendChild(b);
		});
	}

	initOceanLife();
	initOrbPop();
});

/* ----------------------------------------------------------
   UNDERWATER LIFE — distant fish schools, drawn as specks
   Schools use a stored 24-h schedule so navigation
   never restarts them mid-swim.
   ---------------------------------------------------------- */
function initOceanLife() {
	const container = document.querySelector('.ocean-fx');
	if (!container) return;

	const t0 = +localStorage.getItem('wt_t0') || Date.now();
	const elapsedMs = Date.now() - t0;

	// Deterministic per-speck param generator (mulberry32 PRNG)
	function rng(seed) {
		let s = seed | 0;
		return () => {
			s = (s + 0x6D2B79F5) | 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	// School spacing below were tuned against a ~1600px-wide viewport.
	// On wider screens that fixed pixel size shrinks proportionally into a
	// tiny, disconnected speck, so scale sizes up (never down) for anything
	// wider than that reference.
	const SIZE_REF_W = 1600;
	function widthScale() {
		return Math.max(1, window.innerWidth / SIZE_REF_W);
	}

	// ---- FISH SCHEDULE ----
	const FISH_KEY = 'wt_fsched';
	let fSched;
	try { fSched = JSON.parse(localStorage.getItem(FISH_KEY)); } catch(e) {}
	if (!fSched) {
		fSched = [];
		let t = 2500 + Math.random() * 3500;
		while (t < 86400000) {
			const top = +(12 + Math.random() * 58).toFixed(1);
			const dur = +(9 + Math.random() * 13).toFixed(1);
			fSched.push({ t: Math.round(t), dur, n: 3 + Math.floor(Math.random() * 8),
				r: Math.random() > 0.5 ? 1 : 0, top, opa: +(0.52 - (top / 70) * 0.28).toFixed(3),
				sz: +(12 + Math.random() * 16).toFixed(1), gap: +(3 + Math.random() * 7).toFixed(1),
				seed: Math.floor(Math.random() * 0xFFFFFF) });
			t += dur * 1000 + 12000 + Math.random() * 20000;
		}
		try { localStorage.setItem(FISH_KEY, JSON.stringify(fSched)); } catch(e) {}
	}

	function spawnFish(e, delayS) {
		const group = document.createElement('div');
		const scale = widthScale();
		const topPx = Math.round((e.top / 100) * window.innerHeight);
		const gap = e.gap * scale;
		group.style.cssText = `position:absolute;display:flex;align-items:center;gap:${gap.toFixed(1)}px;top:${topPx}px;left:0;pointer-events:none;will-change:transform,opacity;animation:${e.r ? 'fishLTR' : 'fishRTL'} ${e.dur}s linear forwards;animation-delay:${delayS.toFixed(3)}s`;
		const rand = rng(e.seed);
		for (let i = 0; i < e.n; i++) {
			const sz = (2 + rand() * 2) * scale, op = 0.65 + rand() * 0.35;
			const yo = Math.round(rand() * 30 - 15), bd = +(1.1 + rand() * 0.9).toFixed(2), bdy = +(rand() * 0.8).toFixed(2);
			const speck = document.createElement('div');
			speck.style.cssText = `width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;border-radius:50%;flex-shrink:0;margin-top:${yo}px;background:rgba(100,192,255,${op.toFixed(2)});opacity:${e.opa};animation:fishBob ${bd}s ease-in-out ${bdy}s infinite alternate`;
			group.appendChild(speck);
		}
		container.appendChild(group);
		const rm = (e.dur + delayS) * 1000 + 500;
		if (rm > 0) setTimeout(() => group.remove(), rm);
	}

	let fNext = -1;
	for (let i = 0; i < fSched.length; i++) {
		const e = fSched[i];
		if (e.t + e.dur * 1000 <= elapsedMs) continue;
		if (e.t <= elapsedMs) { spawnFish(e, -(elapsedMs - e.t) / 1000); }
		else if (fNext === -1) { fNext = i; break; }
	}
	(function schedF(idx) {
		if (idx < 0 || idx >= fSched.length) return;
		const e = fSched[idx];
		setTimeout(() => { spawnFish(e, 0); schedF(idx + 1); }, Math.max(0, e.t - elapsedMs));
	})(fNext);
}

/* ----------------------------------------------------------
   ORB BUBBLE-POP MICRO-INTERACTION
   ---------------------------------------------------------- */
function initOrbPop() {
	const orb = document.querySelector('.hero-orb');
	if (!orb) return;

	let busy = false;

	orb.addEventListener('click', () => {
		if (busy) return;
		busy = true;

		const w = orb.offsetWidth;
		const h = orb.offsetHeight;
		const cx = w / 2;
		const cy = h / 2;

		// Spawn burst particles
		const palette = [
			'rgba(70,216,255,0.92)',
			'rgba(138,255,217,0.9)',
			'rgba(255,255,255,0.82)',
			'rgba(43,141,255,0.9)',
			'rgba(180,240,255,0.85)',
		];
		const count = 16 + Math.floor(Math.random() * 6);

		for (let i = 0; i < count; i++) {
			const p     = document.createElement('div');
			const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
			const dist  = 55 + Math.random() * 95;
			const size  = 4 + Math.random() * 11;
			const dur   = 0.55 + Math.random() * 0.45;
			const color = palette[Math.floor(Math.random() * palette.length)];

			p.className = 'orb-particle';
			p.style.cssText = `
				left: ${(cx - size / 2).toFixed(1)}px;
				top:  ${(cy - size / 2).toFixed(1)}px;
				width: ${size}px; height: ${size}px;
				background: ${color};
				box-shadow: 0 0 ${(size * 1.8).toFixed(0)}px ${color};
				--px: ${(Math.cos(angle) * dist).toFixed(1)}px;
				--py: ${(Math.sin(angle) * dist).toFixed(1)}px;
				--dur: ${dur.toFixed(3)}s;
			`;
			orb.appendChild(p);
			setTimeout(() => p.remove(), (dur + 0.2) * 1000);
		}

		// Collapse
		orb.classList.add('orb-popping');

		// Regenerate
		setTimeout(() => {
			orb.classList.remove('orb-popping');
			orb.classList.add('orb-regen');

			setTimeout(() => {
				orb.classList.remove('orb-regen');
				// Restart float cleanly
				orb.style.animation = 'none';
				void orb.getBoundingClientRect();
				orb.style.animation = '';
				busy = false;
			}, 900);
		}, 460);
	});
}
