document.addEventListener("DOMContentLoaded", function () {
  const msg = document.body.getAttribute("data-toast");
  if (!msg || msg.trim() === "" || msg === "undefined") return;

  const toast = document.createElement("div");
  toast.textContent = msg;

  toast.style.position = "fixed";
  toast.style.left = "50%";
  toast.style.top = "16px";
  toast.style.transform = "translateX(-50%)";
  toast.style.padding = "10px 14px";
  toast.style.border = "1px solid #999";
  toast.style.background = "#fff";
  toast.style.zIndex = "9999";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
});