(() => {
  /* =========================
     INITIALIZATION
     ========================= */
  document.documentElement.classList.add("js");

  // DOM Elements
  const topnav = document.querySelector(".topnav");
  const burger = document.querySelector(".hamburger-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const dropdownToggles = document.querySelectorAll(".nav-dropdown .dropdown-toggle");
  const year = document.getElementById("year");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function loadVideo(video) {
    if (!video) return Promise.resolve(null);
    if (video.dataset.videoLoaded === "true") return Promise.resolve(video);

    const lazySources = Array.from(video.querySelectorAll("source[data-src]"));
    if (!lazySources.length) {
      video.dataset.videoLoaded = "true";
      return Promise.resolve(video);
    }

    lazySources.forEach((source) => {
      if (!source.getAttribute("src")) {
        source.setAttribute("src", source.dataset.src || "");
      }
    });

    video.dataset.videoLoaded = "true";
    video.load();

    if (video.readyState >= 1) {
      return Promise.resolve(video);
    }

    return new Promise((resolve) => {
      const finish = () => resolve(video);
      video.addEventListener("loadedmetadata", finish, { once: true });
      video.addEventListener("error", finish, { once: true });
    });
  }

  // Set current year
  if (year) year.textContent = new Date().getFullYear();


  /* =========================
     LAZY VIDEO LOADING
     ========================= */
  (() => {
    const visibleLazyVideos = Array.from(document.querySelectorAll('video.lazy-video[data-autoload="visible"]'));
    if (!visibleLazyVideos.length) return;

    if (!("IntersectionObserver" in window)) {
      visibleLazyVideos.forEach((video) => {
        loadVideo(video);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          loadVideo(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "300px 0px" }
    );

    visibleLazyVideos.forEach((video) => observer.observe(video));
  })();

  /* =========================
     SMOOTH SCROLL FOR NAV LINKS
     ========================= */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const targetTop = window.pageYOffset + target.getBoundingClientRect().top;
        const extraOffset = href === "#services" ? Math.min(window.innerHeight * 0.03, 10) : 0;

        window.scrollTo({
          top: Math.max(targetTop + extraOffset, 0),
          behavior: 'smooth'
        });
        
        // Close mobile menu after clicking link
        if (isMobileNav() && topnav?.classList.contains('is-menu-open')) {
          setMenuOpen(false);
        }
        
        // Close any open dropdowns
        closeAllDropdowns();
      }
    });
  });

  /* =========================
     ACTIVE NAV HIGHLIGHTING
     ========================= */
  (() => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"], .mobile-menu a[href^="#"]');

    function updateActiveNav() {
      let current = '';
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const scrollPos = window.scrollY + 100; // Offset for header
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${current}`) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav(); // Initial call
  })();

  /* =========================
     HERO BACKGROUND TITLE
     ========================= */
  (() => {
    const heroSection = document.querySelector(".hero-section");
    const heroTitle = document.querySelector(".hero-title-lockup");
    if (!heroSection || !heroTitle) return;

    let hasEntered = false;
    let rafId = null;

    function updateHeroTitleOpacity() {
      const rect = heroSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
      const distance = Math.max(rect.height * 0.65, viewportHeight * 0.7);
      const progress = Math.min(Math.max((-rect.top) / distance, 0), 1);
      const opacity = 1 - progress * 0.80;
      heroTitle.style.setProperty("--hero-title-overlay-opacity", opacity.toFixed(3));
    }

    function requestOpacityUpdate() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateHeroTitleOpacity();
      });
    }

    if (!("IntersectionObserver" in window)) {
      heroTitle.classList.add("is-active");
      heroTitle.classList.add("is-entering");
      updateHeroTitleOpacity();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          heroTitle.classList.toggle("is-active", entry.isIntersecting);
          if (entry.isIntersecting && !hasEntered) {
            hasEntered = true;
            heroTitle.classList.add("is-entering");
            window.setTimeout(() => heroTitle.classList.remove("is-entering"), 950);
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: "-10% 0px -20% 0px"
      }
    );

    observer.observe(heroSection);
    window.addEventListener("scroll", requestOpacityUpdate, { passive: true });
    window.addEventListener("resize", requestOpacityUpdate, { passive: true });
    updateHeroTitleOpacity();
  })();

  /* =========================
     PROJECTS CAROUSEL
     ========================= */
  (() => {
    const projectsTrack = document.querySelector(".projects-track");
    const projectCards = Array.from(document.querySelectorAll(".project-card"));
    const projectsDots = Array.from(document.querySelectorAll(".projects-dot"));
    const projectsPrev = document.querySelector(".projects-arrow--prev");
    const projectsNext = document.querySelector(".projects-arrow--next");
    const projectFilters = Array.from(document.querySelectorAll(".projects-filter-btn"));
    const videoCards = Array.from(document.querySelectorAll(".project-card--has-video"));
    const featuredVideoLoopSeconds = 6;

    if (!projectsTrack || !projectCards.length) return;

    function isProjectsNavActive() {
      return !!document.querySelector('.topnav .nav-link[href="#projects"].active');
    }

    function updateFeaturedCardVideoPlayback() {
      if (!videoCards.length) return;
      videoCards.forEach((card) => {
        const videos = Array.from(card.querySelectorAll(".project-card-media video"));
        const shouldPlay = card.classList.contains("is-active") && isProjectsNavActive();

        videos.forEach((video) => {
          if (!shouldPlay) {
            video.pause();
            return;
          }

          loadVideo(video).then(() => {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          });
        });
      });
    }

    videoCards.forEach((card) => {
      const videos = Array.from(card.querySelectorAll(".project-card-media video"));
      if (!videos.length) return;
      const loopStart = Number(card.dataset.loopStart || 0);
      const safeLoopStart = Number.isFinite(loopStart) && loopStart >= 0 ? loopStart : 0;

      videos.forEach((video) => {
        video.loop = false;
        video.muted = true;
        video.playsInline = true;
      });

      const primaryVideo = videos[0];
      const secondaryVideos = videos.slice(1);

      const getLoopBounds = (video) => {
        const duration = Number(video.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          return {
            start: safeLoopStart,
            end: safeLoopStart + featuredVideoLoopSeconds
          };
        }

        const maxStart = Math.max(duration - featuredVideoLoopSeconds, 0);
        const start = Math.min(safeLoopStart, maxStart);
        const end = Math.min(start + featuredVideoLoopSeconds, Math.max(duration - 0.05, start));

        return { start, end };
      };

      const seekAllToLoopStart = () => {
        videos.forEach((video) => {
          const { start } = getLoopBounds(video);
          const target = Math.min(start, Math.max(video.duration - 0.1, 0));
          video.currentTime = target > 0 ? target : 0;
        });
      };

      const syncSecondaryVideos = () => {
        secondaryVideos.forEach((video) => {
          if (Math.abs(video.currentTime - primaryVideo.currentTime) > 0.08) {
            video.currentTime = primaryVideo.currentTime;
          }
        });
      };

      primaryVideo.addEventListener("timeupdate", () => {
        const { start, end } = getLoopBounds(primaryVideo);
        if (primaryVideo.currentTime >= end || primaryVideo.currentTime < start) {
          seekAllToLoopStart();
        } else {
          syncSecondaryVideos();
        }
      });

      videos.forEach((video) => {
        video.addEventListener("ended", () => {
          seekAllToLoopStart();
          if (card.classList.contains("is-active") && isProjectsNavActive()) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          }
        });

        video.addEventListener("loadedmetadata", () => {
          const { start, end } = getLoopBounds(video);
          const target = Math.min(start, Math.max(video.duration - 0.1, 0));
          if (video.currentTime > end || video.currentTime < start) {
            video.currentTime = target > 0 ? target : 0;
          }
        });
      });
    });

    function getClosestProjectCard() {
      const trackCenter = projectsTrack.scrollLeft + projectsTrack.clientWidth / 2;
      let closestIndex = 0;
      let minDist = Infinity;
      
      projectCards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(trackCenter - cardCenter);
        if (dist < minDist) {
          minDist = dist;
          closestIndex = index;
        }
      });
      
      return { card: projectCards[closestIndex], index: closestIndex };
    }

    function setActiveProject(index, activeCard) {
      projectCards.forEach((card) => {
        card.classList.toggle("is-active", card === activeCard);
        card.classList.toggle("is-side", card !== activeCard);
      });
      
      projectsDots.forEach((dot, idx) => {
        const isActive = idx === index;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      updateFeaturedCardVideoPlayback();
    }

    function setActiveFilterByCategory(category) {
      if (!category) return;
      projectFilters.forEach((btn) => {
        const isActive = btn.getAttribute("data-filter") === category;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function scrollToProject(index, behavior = "smooth") {
      const card = projectCards[index];
      if (!card || !projectsTrack) return;
      
      // Calculate exact center position
      const trackWidth = projectsTrack.clientWidth;
      const cardWidth = card.offsetWidth;
      const cardLeft = card.offsetLeft;
      
      // Center the card by calculating the scroll position
      const scrollLeft = cardLeft - (trackWidth / 2) + (cardWidth / 2);
      
      projectsTrack.scrollTo({ 
        left: scrollLeft, 
        behavior: behavior 
      });
    }

    // Handle scroll updates
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const closest = getClosestProjectCard();
        if (closest) {
          setActiveProject(closest.index, closest.card);
          const category = closest.card.getAttribute("data-category");
          setActiveFilterByCategory(category);
        }
      });
    };

    projectsTrack.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("scroll", updateFeaturedCardVideoPlayback, { passive: true });

    // Initialize
    const centerFirstProject = () => {
      scrollToProject(0, "auto");
      onScroll();
      updateFeaturedCardVideoPlayback();
    };
    requestAnimationFrame(centerFirstProject);

    // Dot navigation
    projectsDots.forEach((dot, index) => {
      dot.addEventListener("click", () => scrollToProject(index));
    });

    // Card navigation
    projectCards.forEach((card) => {
      card.addEventListener("click", () => {
        const href = card.getAttribute("data-href");
        if (href) {
          window.location.href = href;
        }
      });
    });

    // Filter buttons (scroll to first matching project when clicked)
    projectFilters.forEach((button) => {
      button.addEventListener("click", () => {
        // Update active filter
        projectFilters.forEach(btn => {
          btn.classList.remove("is-active");
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add("is-active");
        button.setAttribute('aria-pressed', 'true');

        const filter = button.getAttribute("data-filter");
        if (!filter) return;
        const targetIndex = projectCards.findIndex(
          (card) => card.getAttribute("data-category") === filter
        );
        if (targetIndex >= 0) {
          scrollToProject(targetIndex);
        }
      });
    });

    // Arrow navigation
    const stepProject = (dir) => {
      const closest = getClosestProjectCard();
      const current = closest ? closest.index : 0;
      const count = projectCards.length;
      const next = Math.min(Math.max(current + dir, 0), count - 1);
      scrollToProject(next);
    };

    projectsPrev?.addEventListener("click", () => stepProject(-1));
    projectsNext?.addEventListener("click", () => stepProject(1));

    // Keyboard navigation for carousel
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea')) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepProject(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepProject(1);
      }
    });
  })();

  /* =========================
     STATIC PROJECTS GRID
     ========================= */
  (() => {
    const gridCards = Array.from(document.querySelectorAll(".projects-grid-static .project-card"));
    if (!gridCards.length) return;

    gridCards.forEach((card) => {
      const video = card.querySelector("video.lazy-video");

      card.addEventListener("click", () => {
        const href = card.getAttribute("data-href");
        if (href) window.location.href = href;
      });

      if (!video || prefersReducedMotion.matches) return;

      card.addEventListener("mouseenter", () => {
        loadVideo(video).then(() => {
          const play = video.play();
          if (play && typeof play.catch === "function") play.catch(() => {});
        });
      });

      card.addEventListener("mouseleave", () => {
        video.pause();
      });
    });
  })();

  /* =========================
     PROJECTS ARCHIVE REVEAL
     ========================= */
  (() => {
    const tiles = Array.from(document.querySelectorAll(".projects-page .project-tile"));
    if (!tiles.length) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const tile = entry.target;
            tile.style.animationDelay = "0ms";
            tile.classList.add("is-revealed");
            obs.unobserve(tile);
          });
        },
        { threshold: 0.05, rootMargin: "0px" }
      );

      tiles.forEach((tile) => observer.observe(tile));
    } else {
      tiles.forEach((tile) => tile.classList.add("is-revealed"));
    }
  })();

  /* =========================
     PROJECT THUMB VIDEO PREVIEW FRAMES
     ========================= */
  (() => {
    const previewThumbs = Array.from(document.querySelectorAll(".projects-page .project-thumb--video-blur"));
    if (!previewThumbs.length) return;

    previewThumbs.forEach((thumb) => {
      const previewTime = Number(thumb.dataset.previewTime || 12);
      const videos = Array.from(thumb.querySelectorAll("video"));
      if (!videos.length || !Number.isFinite(previewTime) || previewTime < 0) return;

      videos.forEach((video) => {
        video.loop = false;
        video.muted = true;
        video.playsInline = true;
        video.pause();

        video.addEventListener("loadedmetadata", () => {
          const target = Math.min(previewTime, Math.max(video.duration - 0.1, 0));
          video.currentTime = target > 0 ? target : 0;
        }, { once: true });

        video.addEventListener("seeked", () => {
          video.pause();
        }, { once: true });
      });
    });
  })();

  /* =========================
     PROJECT DETAIL REVEAL
     ========================= */
  (() => {
    const cards = Array.from(
      document.querySelectorAll(
        ".project-detail-page .project-hero-card, .project-detail-page .project-info-card, .project-detail-page .contact-footer"
      )
    );
    if (!cards.length) return;

    cards.forEach((card) => card.classList.add("reveal-card"));

    const reveal = () => {
      cards.forEach((card, index) => {
        const delay = Math.min(index * 120, 480);
        card.style.animationDelay = `${delay}ms`;
        card.classList.add("is-revealed");
      });
    };

    const queueReveal = () => requestAnimationFrame(reveal);

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", queueReveal, { once: true });
    } else {
      queueReveal();
    }
  })();

  /* =========================
     WORKFLOW PAGE REVEAL
     ========================= */
  (() => {
    const cards = Array.from(
      document.querySelectorAll(
        ".workflow-page .workflow-overview-card, .workflow-page .workflow-pricing-card, .workflow-page .workflow-breakdown-card, .workflow-page .contact-footer"
      )
    );
    if (!cards.length || prefersReducedMotion.matches) return;

    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "scale(0.86)";
      card.style.animation = "none";
    });

    const reveal = () => {
      cards.forEach((card, index) => {
        const delay = Math.min(index * 140, 560);
        window.setTimeout(() => {
          card.style.animation = "bouncyZoomIn 900ms cubic-bezier(0.2, 1.1, 0.4, 1) both";
          card.style.opacity = "1";
          card.style.transform = "scale(1)";
        }, delay);
      });
    };

    const queueReveal = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(reveal);
      });
    };

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", queueReveal, { once: true });
    } else {
      queueReveal();
    }
  })();

  /* =========================
     WORKFLOW NODE REVEAL
     ========================= */
  (() => {
    const nodes = Array.from(document.querySelectorAll(".workflow-page .workflow-stage-card"));
    if (!nodes.length || prefersReducedMotion.matches) return;

    nodes.forEach((node) => {
      node.style.opacity = "0";
      node.style.transform = "scale(0.86)";
      node.style.animation = "none";
    });

    const revealNodes = () => {
      nodes.forEach((node, index) => {
        window.setTimeout(() => {
          node.style.animation = "bouncyZoomIn 1100ms cubic-bezier(0.2, 1.1, 0.4, 1) both";
          node.style.opacity = "1";
          node.style.transform = "scale(1)";
        }, index * 140);
      });
    };

    const queueReveal = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(revealNodes);
      });
    };

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", queueReveal, { once: true });
    } else {
      queueReveal();
    }
  })();

  /* =========================
     PROJECT DETAIL YOUTUBE PLAY BUTTON
     ========================= */
  (() => {
    const mediaTile = document.querySelector(".project-detail-page .project-media-tile--youtube");
    const playBtn = mediaTile?.querySelector(".project-media-play-btn");
    if (!mediaTile || !playBtn) return;

    const embedSrc = mediaTile.dataset.embedSrc;
    const embedTitle = mediaTile.dataset.embedTitle || "Project video";
    if (!embedSrc) return;

    playBtn.addEventListener("click", () => {
      if (mediaTile.dataset.embedLoaded === "true") return;

      const iframe = document.createElement("iframe");
      iframe.className = "project-media-embed";
      iframe.src = embedSrc;
      iframe.title = embedTitle;
      iframe.loading = "eager";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;

      mediaTile.appendChild(iframe);
      mediaTile.dataset.embedLoaded = "true";
      playBtn.classList.add("is-hidden");
      playBtn.setAttribute("aria-hidden", "true");
    });
  })();

  /* =========================
     PROJECT DETAIL VIDEO PLAY BUTTON
     ========================= */
  (() => {
    const mediaTile = document.querySelector(
      ".project-detail-page .project-media-tile--has-video:not(.project-media-tile--youtube)"
    );
    const primaryVideo = mediaTile?.querySelector(".project-media-video");
    const playBtn = mediaTile?.querySelector(".project-media-play-btn");
    if (!mediaTile || !primaryVideo || !playBtn) return;
    const previewTimeSeconds = Number(primaryVideo.dataset.previewTime);
    const hasPreviewTime = Number.isFinite(previewTimeSeconds) && previewTimeSeconds >= 0;
    let previewFrameReady = false;

    const hidePlayButton = () => {
      playBtn.classList.add("is-hidden");
      playBtn.setAttribute("aria-hidden", "true");
    };

    const primePreviewFrame = () => {
      if (!Number.isFinite(primaryVideo.duration) || primaryVideo.duration <= 0) return;
      const target = Math.min(previewTimeSeconds, Math.max(primaryVideo.duration - 0.1, 0));
      if (target <= 0) return;
      primaryVideo.currentTime = target;
    };

    if (hasPreviewTime) {
      primaryVideo.addEventListener("loadedmetadata", primePreviewFrame, { once: true });
      primaryVideo.addEventListener("seeked", () => {
        if (!previewFrameReady) {
          previewFrameReady = true;
          primaryVideo.pause();
        }
      });
    }

    primaryVideo.loop = false;
    primaryVideo.playsInline = true;
    primaryVideo.muted = false;
    primaryVideo.controls = false;

    playBtn.addEventListener("click", () => {
      if (previewFrameReady && primaryVideo.currentTime > 1) {
        primaryVideo.currentTime = 0;
      }
      primaryVideo.controls = true;
      const playPromise = primaryVideo.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    });

    primaryVideo.addEventListener("play", hidePlayButton, { once: true });
  })();

  /* =========================
     FORM SUBMISSION
     ========================= */
  document.addEventListener("submit", (e) => {
    if (e.target.matches(".contact-form")) {
      e.preventDefault();

      const form = e.target;
      const endpoint = form.getAttribute("action") || "";
      const status = form.querySelector(".contact-form-status");
      const submitButton = form.querySelector('button[type="submit"]');

      if (!endpoint) {
        if (status) {
          status.textContent = "This form is missing a submission endpoint.";
        } else {
          alert("This form is missing a submission endpoint.");
        }
        return;
      }

      const formData = new FormData(form);

      if (status) status.textContent = "Sending...";
      if (submitButton) submitButton.disabled = true;

      fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: formData
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Submission failed");
          }
          form.reset();
          if (status) {
            status.textContent = "Thank you. Your message was sent.";
          } else {
            alert("Thank you. Your message was sent.");
          }
        })
        .catch(() => {
          if (status) {
            status.textContent = "Something went wrong. Please try again.";
          } else {
            alert("Something went wrong. Please try again.");
          }
        })
        .finally(() => {
          if (submitButton) submitButton.disabled = false;
        });
    }
  });

  /* =========================
     DROPDOWN FUNCTIONALITY
     ========================= */
  function setDropdownOpen(dropdownEl, open) {
    const btn = dropdownEl?.querySelector(".dropdown-toggle");
    dropdownEl?.classList.toggle("is-open", open);
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".nav-dropdown").forEach((dd) => 
      setDropdownOpen(dd, false)
    );
  }

  dropdownToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dd = btn.closest(".nav-dropdown");
      const isOpen = dd?.classList.contains("is-open");

      closeAllDropdowns();
      if (dd) setDropdownOpen(dd, !isOpen);
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => closeAllDropdowns());

  // Prevent clicks inside dropdown from closing it
  document.querySelectorAll(".nav-dropdown").forEach((dd) => {
    dd.addEventListener("click", (e) => e.stopPropagation());
  });

  /* =========================
     MOBILE MENU
     ========================= */
  const isMobileNav = () => window.matchMedia("(max-width: 1000px)").matches;

  function setMenuOpen(open) {
    if (!topnav || !burger) return;
    topnav.classList.toggle("is-menu-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");

    // Close dropdowns when closing the menu
    if (!open) closeAllDropdowns();
    
    // Prevent body scroll when menu is open on mobile
    if (isMobileNav()) {
      document.body.style.overflow = open ? 'hidden' : '';
    }
  }

  function toggleMenu() {
    const isOpen = topnav?.classList.contains("is-menu-open");
    setMenuOpen(!isOpen);
  }

  burger?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking outside (mobile only)
  document.addEventListener("click", (e) => {
    if (!isMobileNav()) return;
    if (!topnav?.classList.contains("is-menu-open")) return;

    const clickedInsideMenu = 
      burger?.contains(e.target) || 
      mobileMenu?.contains(e.target);

    if (!clickedInsideMenu) setMenuOpen(false);
  });

  // Don't close when clicking inside the bubble
  mobileMenu?.addEventListener("click", (e) => e.stopPropagation());

  // Close menu when window is resized to desktop
  window.addEventListener('resize', () => {
    if (!isMobileNav() && topnav?.classList.contains('is-menu-open')) {
      setMenuOpen(false);
    }
  });

  // Close menu with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (topnav?.classList.contains('is-menu-open')) {
        setMenuOpen(false);
      }
      closeAllDropdowns();
    }
  });

  /* =========================
     HEADER SCROLL EFFECT
     ========================= */
  (() => {
    const header = document.querySelector('.topbar');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.style.boxShadow =
          'inset 0 0 0 1px rgba(255, 214, 165, 0.10), 0 4px 20px rgba(0, 0, 0, 0.4)';
      } else {
        header.style.boxShadow = 'inset 0 0 0 1px rgba(255, 214, 165, 0.10)';
      }
    }, { passive: true });
  })();

  /* =========================
     INTERSECTION OBSERVER FOR ANIMATIONS
     ========================= */
  (() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0, rootMargin: '0px' });

    // Skip archive-section elements — their tiles have their own reveal
    document.querySelectorAll('section:not(.archive-section)').forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(section);
    });

    const style = document.createElement('style');
    style.textContent = `
      section.is-visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `;
    document.head.appendChild(style);
  })();

  /* =========================
     PERFORMANCE: DEBOUNCE RESIZE
     ========================= */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  window.addEventListener('resize', debounce(() => {
    // Recalculate any layout-dependent values here if needed
  }, 250));

  /* =========================
     ACCESSIBILITY: FOCUS VISIBLE
     ========================= */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });

  // Add focus styles for keyboard navigation
  const focusStyle = document.createElement('style');
  focusStyle.textContent = `
    body:not(.keyboard-nav) *:focus {
      outline: none;
    }
    body.keyboard-nav *:focus-visible {
      outline: 2px solid rgba(255, 0, 0, 0.5);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(focusStyle);

  /* =========================
     BACK LINK ARROW
     ========================= */
  document.querySelectorAll('.project-back').forEach(link => {
    const label = link.textContent.trim();
    if (!link.getAttribute('aria-label')) link.setAttribute('aria-label', label);
    link.innerHTML = '<svg width="52" height="14" viewBox="0 0 52 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M51 7H1M9 1L1 7L9 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  });

  /* =========================
     BACK TO TOP BUTTON
     ========================= */
  (() => {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.classList.toggle('is-visible', window.scrollY > 300);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

})();
