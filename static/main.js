document.addEventListener('DOMContentLoaded', () => {
    const scrollAnchors = document.querySelectorAll('a[href^="#"]');
    
    // Optimize scroll handling with IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe feature cards and showcase images for lazy loading
    document.querySelectorAll('.feature-card, .feature-subtle, .showcase-grid img').forEach(el => {
        observer.observe(el);
    });

    // Optimized scroll handling
    const smoothScroll = (e) => {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href');
        if (targetId === '#') return; // Skip empty hrefs
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    scrollAnchors.forEach(anchor => {
        if (anchor.getAttribute('href') !== '#') { // Only add listener if href is not '#'
            anchor.addEventListener('click', smoothScroll, { passive: false });
        }
    });

    // Image zoom functionality
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = document.querySelector('.modal-close');

    document.querySelectorAll('.showcase-grid img').forEach(img => {
        img.addEventListener('click', () => {
            modalImg.src = img.src;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    });

    const closeModal = () => {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Documentation Modal Functionality
    const docsModal = document.getElementById('docsModal');
    const docsCloseBtn = document.querySelector('.docs-close');
    const docsButtons = document.querySelectorAll('a[href="documentation.html"], .docs-trigger');

    const closeDocs = () => {
        docsModal.classList.remove('show');
        document.body.style.overflow = '';
    };

    const openDocs = (e) => {
        e.preventDefault();
        docsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        // Set initial active section
        const requirementsSection = document.getElementById('requirements');
        if (requirementsSection) {
            requirementsSection.classList.add('active');
        }
    };

    docsButtons.forEach(btn => btn.addEventListener('click', openDocs));
    if (docsCloseBtn) {
        docsCloseBtn.addEventListener('click', closeDocs);
    }

    docsModal.addEventListener('click', (e) => {
        if (e.target === docsModal) closeDocs();
    });

    // Documentation Navigation
    const docsNavLinks = document.querySelectorAll('.docs-nav a');
    const docsSections = document.querySelectorAll('.docs-section');

    docsNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            // Remove active class from all links and sections
            docsNavLinks.forEach(l => l.classList.remove('active'));
            docsSections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link and corresponding section
            link.classList.add('active');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // If on mobile, scroll the section into view
            if (window.innerWidth <= 768) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Update the keydown event listener to handle both modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDocs();
        }
    });

    // Code Copy Functionality
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
            const codeBlock = button.nextElementSibling;
            const code = codeBlock.textContent;
            
            navigator.clipboard.writeText(code).then(() => {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                button.textContent = 'Failed!';
                
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            });
        });
    });

    // Initialize Prism.js
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
});
