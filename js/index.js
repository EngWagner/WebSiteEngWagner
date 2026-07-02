/**
 * Wagner Barbosa Personal Portfolio
 * Main JavaScript File (Vanilla JS + GSAP)
 * 
 * Optimized for performance and readability. Removed jQuery dependency.
 */

// Screen Loader & Navigation Animations
window.addEventListener('load', function () {
    gsap.to('#loader', 1, { y: "-100%" });
    gsap.to('#loader', 1, { opacity: 0 });
    gsap.to('#loader', 0, { display: "none", delay: 1 });
    gsap.to('#header', 0, { display: "block", delay: 1 });
    gsap.to('#navigation-content', 0, { display: "none" });
    gsap.to('#navigation-content', 0, { display: "flex", delay: 1 });

    // Initialize Text Rotating Effect
    const elements = document.getElementsByClassName('txt-rotate');
    for (let i = 0; i < elements.length; i++) {
        const toRotate = elements[i].getAttribute('data-rotate');
        const period = elements[i].getAttribute('data-period');
        if (toRotate) {
            new TxtRotate(elements[i], JSON.parse(toRotate), period);
        }
    }
    // Inject blinking cursor styles for TxtRotate
    const css = document.createElement("style");
    css.type = "text/css";
    css.innerHTML = ".txt-rotate > .wrap { border-right: 0em solid #666; }";
    document.body.appendChild(css);
});

// Navigation Menu Toggle and Section Routing
document.addEventListener('DOMContentLoaded', function () {
    const menubar = document.querySelector('.menubar');
    const navigationClose = document.querySelector('.navigation-close');
    const navigationContent = document.getElementById('navigation-content');

    if (menubar && navigationContent) {
        menubar.addEventListener('click', function () {
            gsap.to(navigationContent, 0.6, { y: 0 });
        });
    }

    if (navigationClose && navigationContent) {
        navigationClose.addEventListener('click', function () {
            gsap.to(navigationContent, 0.6, { y: "-100%" });
        });
    }

    // Section Transition Handler
    function transitionToSection(targetSectionId) {
        // Slide out the navigation overlay
        gsap.to(navigationContent, 0, { display: "none", delay: 0.7 });
        gsap.to(navigationContent, 0, { y: '-100%', delay: 0.7 });

        // Trigger slide-down transition panels
        gsap.to('#breaker', 0, { display: "block" });
        gsap.to('#breaker-two', 0, { display: "block", delay: 0.1 });
        gsap.to('#breaker', 0, { display: "none", delay: 2 });
        gsap.to('#breaker-two', 0, { display: "none", delay: 2 });

        // Toggle visibility of the correct section
        const sections = ['#header', '#about', '#contact'];
        sections.forEach(id => {
            const sectionEl = document.querySelector(id);
            if (sectionEl) {
                if (id === targetSectionId) {
                    gsap.to(id, 0, { display: "block", delay: 0.7 });
                } else {
                    gsap.to(id, 0, { display: "none", delay: 0.7 });
                }
            }
        });

        // Re-enable navigation overlays
        gsap.to(navigationContent, 0, { display: 'flex', delay: 2 });
    }

    // Bind navigation links
    const homeLink = document.getElementById('home-link');
    const aboutLink = document.getElementById('about-link');
    const contactLink = document.getElementById('contact-link');

    if (homeLink) {
        homeLink.addEventListener('click', function (e) {
            e.preventDefault();
            transitionToSection('#header');
        });
    }
    if (aboutLink) {
        aboutLink.addEventListener('click', function (e) {
            e.preventDefault();
            transitionToSection('#about');
        });
    }
    if (contactLink) {
        contactLink.addEventListener('click', function (e) {
            e.preventDefault();
            transitionToSection('#contact');
        });
    }

    // Smooth Cursor Follower (Lag-free GSAP implementation)
    const cursor = document.querySelector('.cursor');
    if (cursor) {
        window.addEventListener('mousemove', function (e) {
            gsap.to(cursor, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.1,
                ease: "power2.out"
            });
        });

        const interactiveElements = document.querySelectorAll('a, button, .menubar, .navigation-close');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', function () {
                gsap.to(cursor, { scale: 1.4, opacity: 1 });
            });
            el.addEventListener('mouseleave', function () {
                gsap.to(cursor, { scale: 1, opacity: 0.6 });
            });
        });
    }
});

// Text Rotating (Typewriter effect) Constructor
const TxtRotate = function (el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = '';
    this.tick();
    this.isDeleting = false;
};

TxtRotate.prototype.tick = function () {
    const i = this.loopNum % this.toRotate.length;
    const fullTxt = this.toRotate[i];

    if (this.isDeleting) {
        this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
        this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>';

    const that = this;
    let delta = 200 - Math.random() * 100;

    if (this.isDeleting) {
        delta /= 2;
    }

    if (!this.isDeleting && this.txt === fullTxt) {
        delta = this.period;
        this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
        this.isDeleting = false;
        this.loopNum++;
        delta = 100;
    }

    setTimeout(function () {
        that.tick();
    }, delta);
};