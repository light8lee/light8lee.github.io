(function () {
  "use strict";

  function createLightbox() {
    var dialog = document.createElement("dialog");
    dialog.className = "image-lightbox";
    dialog.setAttribute("aria-label", "图片放大查看器");
    dialog.innerHTML =
      '<button class="image-lightbox__close" type="button" aria-label="关闭图片查看">关闭 <span aria-hidden="true">×</span></button>' +
      '<figure class="image-lightbox__figure"><img alt=""><figcaption></figcaption></figure>';

    dialog.querySelector(".image-lightbox__close").addEventListener("click", function () {
      dialog.close();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function setup() {
    var dialog = createLightbox();
    var preview = dialog.querySelector("img");
    var caption = dialog.querySelector("figcaption");

    function open(image) {
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt || "文章配图";
      caption.textContent = image.alt || "按 Esc 或点击背景关闭";
      dialog.showModal();
    }

    document.querySelectorAll(".post-content img").forEach(function (image) {
      image.classList.add("image-lightbox-trigger");
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-label", (image.alt || "文章图片") + "，双击放大查看");

      image.addEventListener("dblclick", function () {
        open(image);
      });

      image.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(image);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
