// Dashboard sign-in: Firebase Google sign-in, then a Bearer token on backend calls.
(function () {
  var cfg = window.FIREBASE_CONFIG || {};
  var admins = (window.ADMIN_EMAILS || []).map(function (e) { return e.toLowerCase(); });
  var BACKEND = /herokuapp\.com|azurewebsites\.net/;

  var gate = document.createElement("div");
  gate.id = "auth-gate";
  gate.style.cssText = "position:fixed;inset:0;z-index:99999;background:#111;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;gap:12px";
  gate.innerHTML = '<div id="auth-msg">Loading sign-in...</div><button id="auth-btn" style="display:none;padding:10px 18px;font-size:16px;cursor:pointer">Sign in with Google</button>';
  document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(gate); });
  if (document.body) document.body.appendChild(gate);

  function msg(t, showBtn) {
    var m = document.getElementById("auth-msg"), b = document.getElementById("auth-btn");
    if (m) m.textContent = t;
    if (b) b.style.display = showBtn ? "inline-block" : "none";
  }

  if (!cfg.apiKey || cfg.apiKey === "REPLACE_ME") {
    document.addEventListener("DOMContentLoaded", function () {
      msg("Sign-in is not configured yet (Firebase web config missing).", false);
    });
    return;
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  var ready = load("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js")
    .then(function () { return load("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"); })
    .then(function () {
      firebase.initializeApp(cfg);
      return new Promise(function (resolve) {
        firebase.auth().onAuthStateChanged(function (user) {
          if (user && user.email && admins.indexOf(user.email.toLowerCase()) >= 0) {
            gate.style.display = "none";
            resolve(user);
          } else if (user) {
            msg("Signed in as " + user.email + ", which is not allowed here.", true);
            firebase.auth().signOut();
          } else {
            msg("Sign in to open the dashboard.", true);
          }
        });
      });
    });

  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "auth-btn") {
      var p = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(p).catch(function (err) { msg("Sign-in failed: " + err.message, true); });
    }
  });

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
