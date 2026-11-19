// Dashboard sign-in: Firebase Google sign-in, then a Bearer token on backend calls.
// Fails closed: until a verified admin is signed in, the page is covered and backend calls are blocked.
(function () {
  var cfg = window.FIREBASE_CONFIG || {};
  var admins = (window.ADMIN_EMAILS || []).map(function (e) { return e.toLowerCase(); });
  var BACKEND = /herokuapp\.com|azurewebsites\.net/;
  var configured = !!cfg.apiKey && cfg.apiKey !== "REPLACE_ME";

  var gate = document.createElement("div");
  gate.id = "auth-gate";
  gate.style.cssText = "position:fixed;inset:0;z-index:99999;background:#111;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;gap:12px";
  gate.innerHTML = '<div id="auth-msg">Loading sign-in...</div><button id="auth-btn" style="display:none;padding:10px 18px;font-size:16px;cursor:pointer">Sign in with Google</button>';
  function mount() { if (!gate.parentNode) document.body.appendChild(gate); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  function msg(t, showBtn) {
    var m = document.getElementById("auth-msg"), b = document.getElementById("auth-btn");
    if (m) m.textContent = t;
    if (b) b.style.display = showBtn ? "inline-block" : "none";
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error("Could not load " + src)); };
      document.head.appendChild(s);
    });
  }

  var ready;
  if (!configured) {
    msg("Sign-in is not configured yet (Firebase web config missing).", false);
    ready = Promise.reject(new Error("Sign-in not configured"));
  } else {
    ready = load("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js")
      .then(function () { return load("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"); })
      .then(function () {
        firebase.initializeApp(cfg);
        return new Promise(function (resolve) {
          firebase.auth().onAuthStateChanged(function (user) {
            if (user && user.email && user.emailVerified && admins.indexOf(user.email.toLowerCase()) >= 0) {
              gate.style.display = "none";
              resolve(user);
            } else if (user) {
              msg("Signed in as " + user.email + ", which is not allowed here.", true);
              firebase.auth().signOut();
            } else {
              gate.style.display = "flex";
              msg("Sign in to open the dashboard.", true);
            }
          });
        });
      });
    ready.catch(function (err) { msg("Sign-in could not start: " + err.message, false); });
  }

  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "auth-btn" && window.firebase) {
      var p = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(p).catch(function (err) { msg("Sign-in failed: " + err.message, true); });
    }
  });

  // Backend calls wait for a signed-in admin and carry the Bearer token. If sign-in is not available, they fail.
  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (!BACKEND.test(url)) return origFetch(input, init);
    return ready.then(function (user) { return user.getIdToken(); }).then(function (token) {
      var headers = new Headers((init && init.headers) || (input && input.headers) || {});
      headers.set("Authorization", "Bearer " + token);
      return origFetch(input, Object.assign({}, init || {}, { headers: headers }));
    });
  };
})();
