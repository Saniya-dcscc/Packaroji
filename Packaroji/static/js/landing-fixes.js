(function () {
    "use strict";

    function swapLandingHeroImage() {
        var image = document.querySelector(".new-landing-media img");
        if (!image) return;
        image.src = "/static/images/packaging-hero-new.jpg";
        image.style.visibility = "visible";
        var style = document.getElementById("packaroji-hero-image-fix");
        if (!style) {
            style = document.createElement("style");
            style.id = "packaroji-hero-image-fix";
            style.textContent = ".new-landing-hero{background:#f5f0e3!important;}.new-landing-media{z-index:0!important;}.new-landing-inner{position:relative!important;z-index:1!important;} .new-landing-media img{object-fit:cover!important;object-position:center center!important;}";
            document.head.appendChild(style);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", swapLandingHeroImage, { once: true });
    } else {
        swapLandingHeroImage();
    }
})();
