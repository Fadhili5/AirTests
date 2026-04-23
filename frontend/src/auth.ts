import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8081",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "or-atm",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "or-atm-dashboard",
});

export async function initAuth() {
  if (import.meta.env.VITE_AUTH_DISABLED === "true") {
    localStorage.removeItem("or_atm_token");
    return null;
  }

  await keycloak.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  if (keycloak.token) {
    localStorage.setItem("or_atm_token", keycloak.token);
  }

  window.setInterval(async () => {
    try {
      await keycloak.updateToken(30);
      if (keycloak.token) {
        localStorage.setItem("or_atm_token", keycloak.token);
      }
    } catch {
      keycloak.login();
    }
  }, 20000);

  return keycloak;
}
