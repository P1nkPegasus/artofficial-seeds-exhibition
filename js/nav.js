document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownParent = document.querySelector(".dropdown");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.classList.toggle("active");
      navLinks.classList.toggle("show", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  if (dropdownToggle && dropdownParent) {
    dropdownToggle.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault(); // Prevents jumping or blank reloads
      dropdownParent.classList.toggle("open");
    }
    });
  }
});
