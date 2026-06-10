// WhaleTale site behaviour

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

	// build bubbles
	const bubbles = document.querySelector('.bubbles');
	if (bubbles) {
		for (let i = 0; i < 14; i++) {
			const b = document.createElement('span');
			const s = 6 + Math.random() * 22;
			b.style.setProperty('--s', s + 'px');
			b.style.left = Math.random() * 100 + '%';
			b.style.setProperty('--d', (10 + Math.random() * 14) + 's');
			b.style.setProperty('--delay', (Math.random() * 12) + 's');
			b.style.setProperty('--x', (Math.random() * 80 - 40) + 'px');
			bubbles.appendChild(b);
		}
	}
});
