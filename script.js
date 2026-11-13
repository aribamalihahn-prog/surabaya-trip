/* ============================================================
   SURABAYA TRIP — script.js
   Handles: mobile nav, booking modal (3 steps), payment tabs,
   file upload preview, e-ticket generation, WhatsApp integration
   ============================================================ */

/* ===== CONFIG ===== */
const WA_NUMBER = "6281234567890"; // <-- REPLACE with your real WhatsApp number (no +, no spaces)

/* ===== STATE ===== */
let currentPackage = "";
let currentPrice = "";
let currentBookingId = "";
let proofFileName = "";

/* ===== MOBILE NAV ===== */
function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
}
function closeMenu() {
  document.getElementById("mobileMenu").classList.remove("open");
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 768) closeMenu();
});

/* ===== NAVBAR SCROLL EFFECT ===== */
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 30) {
    navbar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)";
  } else {
    navbar.style.boxShadow = "none";
  }
});

/* ===== BOOKING MODAL ===== */
function openBooking(packageName, price) {
  currentPackage = packageName;
  currentPrice = price;

  document.getElementById("selectedPackageLabel").textContent = `Package: ${packageName} — ${price}`;
  document.getElementById("bookingModal").classList.add("open");
  document.body.style.overflow = "hidden";

  goToStep(1);
  closeMenu();
}

function closeBooking() {
  document.getElementById("bookingModal").classList.remove("open");
  document.body.style.overflow = "";
}

function closeIfOverlay(e) {
  if (e.target.id === "bookingModal") closeBooking();
}

function goToStep(stepNumber) {
  document.querySelectorAll(".modal-step").forEach(s => s.classList.remove("active"));
  document.getElementById("step" + stepNumber).classList.add("active");
  document.querySelector(".modal-box").scrollTop = 0;
}

/* ===== STEP 1 -> STEP 2 (validate personal info) ===== */
function goToPayment() {
  const required = [
    { id: "bName", label: "Full Name" },
    { id: "bWa", label: "WhatsApp Number" },
    { id: "bEmail", label: "Email Address" },
    { id: "bNation", label: "Nationality" },
    { id: "bPax", label: "Number of Passengers" },
    { id: "bShip", label: "Ship Name" },
    { id: "bDate", label: "Port Arrival Date" },
    { id: "bDepTime", label: "Ship Departure Time" }
  ];

  for (const field of required) {
    const el = document.getElementById(field.id);
    if (!el.value.trim()) {
      showToast(`Please fill in: ${field.label}`);
      el.focus();
      return;
    }
  }

  const email = document.getElementById("bEmail").value.trim();
  if (!email.includes("@") || !email.includes(".")) {
    showToast("Please enter a valid email address");
    document.getElementById("bEmail").focus();
    return;
  }

  const name = document.getElementById("bName").value.trim();
  const pax = document.getElementById("bPax").value.trim();
  const date = document.getElementById("bDate").value;

  document.getElementById("paymentSummary").innerHTML = `
    <p><strong>Package:</strong> ${currentPackage}</p>
    <p><strong>Passenger:</strong> ${name} (${pax} pax)</p>
    <p><strong>Tour Date:</strong> ${formatDate(date)}</p>
    <p><strong>Total Price:</strong> ${currentPrice}</p>
  `;

  goToStep(2);
}

/* ===== PAYMENT METHOD TABS ===== */
function switchPm(method, tabEl) {
  document.querySelectorAll(".pm-tab").forEach(t => t.classList.remove("active"));
  tabEl.classList.add("active");

  document.querySelectorAll(".pm-content").forEach(c => c.classList.remove("active"));
  document.getElementById(method === "qris" ? "pmQris" : "pmTransfer").classList.add("active");
}

/* ===== COPY BANK ACCOUNT NUMBER ===== */
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Account number copied!");
  }).catch(() => {
    showToast("Could not copy. Please copy manually: " + text);
  });
}

/* ===== PROOF UPLOAD PREVIEW ===== */
function previewProof(input) {
  const file = input.files[0];
  const previewBox = document.getElementById("proofPreview");
  const uploadText = document.getElementById("uploadText");

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast("File too large. Max 5MB.");
    input.value = "";
    return;
  }

  proofFileName = file.name;
  uploadText.textContent = `✓ ${file.name}`;
  document.getElementById("uploadArea").style.borderColor = "var(--coral)";

  previewBox.classList.remove("hidden");

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = e => {
      previewBox.innerHTML = `<img src="${e.target.result}" alt="Payment proof preview"/>`;
    };
    reader.readAsDataURL(file);
  } else {
    previewBox.innerHTML = `<p>📄 ${file.name} (PDF attached)</p>`;
  }
}

/* ===== STEP 2 -> STEP 3 (validate payment proof + submit) ===== */
function submitBooking() {
  const proofInput = document.getElementById("bProof");
  if (!proofInput.files || proofInput.files.length === 0) {
    showToast("Please upload your payment proof before submitting");
    return;
  }

  currentBookingId = "ST-" + Date.now().toString().slice(-8);

  buildETicket();
  goToStep(3);
}

/* ===== BUILD E-TICKET ===== */
function buildETicket() {
  const name = document.getElementById("bName").value.trim();
  const pax = document.getElementById("bPax").value.trim();
  const ship = document.getElementById("bShip").value.trim();
  const date = document.getElementById("bDate").value;
  const depTime = document.getElementById("bDepTime").value;

  document.getElementById("eticketBox").innerHTML = `
    <div class="eticket-header">
      <span class="eticket-title">⚓ Surabaya Trip</span>
      <span class="eticket-tag">PENDING VERIFICATION</span>
    </div>
    <div class="eticket-row"><span>Passenger Name</span><span>${escapeHtml(name)}</span></div>
    <div class="eticket-row"><span>Package</span><span>${escapeHtml(currentPackage)}</span></div>
    <div class="eticket-row"><span>Passengers</span><span>${escapeHtml(pax)} pax</span></div>
    <div class="eticket-row"><span>Ship Name</span><span>${escapeHtml(ship)}</span></div>
    <div class="eticket-row"><span>Tour Date</span><span>${formatDate(date)}</span></div>
    <div class="eticket-row"><span>Ship Departure</span><span>${escapeHtml(depTime)}</span></div>
    <div class="eticket-row"><span>Total Price</span><span>${escapeHtml(currentPrice)}</span></div>
    <div class="eticket-id">Booking ID: ${currentBookingId}</div>
  `;
}

/* ===== SEND BOOKING TO WHATSAPP ===== */
function sendToWA() {
  const name = document.getElementById("bName").value.trim();
  const wa = document.getElementById("bWa").value.trim();
  const email = document.getElementById("bEmail").value.trim();
  const nation = document.getElementById("bNation").value.trim();
  const pax = document.getElementById("bPax").value.trim();
  const ship = document.getElementById("bShip").value.trim();
  const date = document.getElementById("bDate").value;
  const depTime = document.getElementById("bDepTime").value;
  const notes = document.getElementById("bNotes").value.trim();

  const message =
`New Booking Request — Surabaya Trip

Booking ID: ${currentBookingId}
Package: ${currentPackage} (${currentPrice})

--- Passenger Info ---
Name: ${name}
WhatsApp: ${wa}
Email: ${email}
Nationality: ${nation}
Passengers: ${pax} pax

--- Ship Info ---
Ship Name: ${ship}
Tour Date: ${formatDate(date)}
Departure Time: ${depTime}

Special Requests: ${notes || "None"}

Payment proof file: ${proofFileName || "Attached in form (please send manually if not received)"}

Please confirm my booking and send the e-ticket. Thank you!`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

/* ===== CONTACT FORM -> WHATSAPP ===== */
function sendContactWA(e) {
  e.preventDefault();

  const name = document.getElementById("cName").value.trim();
  const wa = document.getElementById("cWa").value.trim();
  const msg = document.getElementById("cMsg").value.trim();

  const message =
`Hello Surabaya Trip!

Name: ${name}
WhatsApp: ${wa}

Message: ${msg}`;

  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");

  showToast("Redirecting you to WhatsApp...");
  e.target.reset();
}

/* ===== TOAST NOTIFICATION ===== */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

/* ===== HELPERS ===== */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ===== CLOSE MODAL WITH ESC KEY ===== */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("bookingModal");
    if (modal.classList.contains("open")) closeBooking();
  }
});

/* ===== DRAG & DROP FOR FILE UPLOAD ===== */
document.addEventListener("DOMContentLoaded", () => {
  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("bProof");

  if (!uploadArea || !fileInput) return;

  uploadArea.addEventListener("click", () => fileInput.click());

  ["dragenter", "dragover"].forEach(evt => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--coral)";
      uploadArea.style.background = "var(--coral-pale)";
    });
  });

  ["dragleave", "drop"].forEach(evt => {
    uploadArea.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadArea.style.background = "";
    });
  });

  uploadArea.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      previewProof(fileInput);
    }
  });
});