import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

// Disable Replit auth for local development
const IS_LOCAL = !process.env.REPLIT_DOMAINS;

if (!IS_LOCAL && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Use memory store for local development
  if (IS_LOCAL) {
    return session({
      secret: process.env.SESSION_SECRET || 'local-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: sessionTtl,
      },
    });
  }

  const connectPg = require("connect-pg-simple");
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  return {
    id: user.id,
    name: user.name,
    picture: user.profile_image,
    claims: user,
    data: {
      lastAuth: new Date(),
      __tokenset: tokens.toJSON()
    }
  };
}

async function tryRefresh(user: any) {
  const oidcConfig = await getOidcConfig();
  const { issuer, client: oidcClient } = oidcConfig;
  try {
    const currentTokenSet = new issuer.TokenSet(user.data.__tokenset);
    const refreshedTokenSet = await oidcClient.refresh(currentTokenSet);
    Object.assign(user.data.__tokenset, refreshedTokenSet.toJSON());
    return true;
  } catch (err) {
    console.error("Cannot refresh tokens", err);
    return false;
  }
}

function setupPassport(app: Express): void {
  // For local development, create a mock user
  if (IS_LOCAL) {
    // Skip passport strategy for local dev, handled directly in requireUser
  } else {
    const verify: VerifyFunction = async (tokens, claims, done) => {
      try {
        const user = await storage.upsertUser({
          id: claims.sub,
          name: claims.name,
          picture: claims.profile_image || null,
        });
        const sessionUser = updateUserSession(claims, tokens);
        done(null, sessionUser);
      } catch (err) {
        done(err);
      }
    };

    getOidcConfig().then(({ client: oidcClient }) => {
      const strategy = new Strategy(oidcClient, passport, verify);
      passport.use("repl-oidc", strategy);
    }).catch(console.error);
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function requireUser(): RequestHandler {
  return (req, res, next) => {
    if (IS_LOCAL) {
      // For local development, create a mock user if not authenticated
      if (!req.user) {
        req.user = {
          id: 'local-user',
          name: 'Local User',
          picture: '',
          claims: {},
          data: { lastAuth: new Date() }
        };
      }
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    tryRefresh(req.user);
    next();
  };
}

export function initAuth(app: Express) {
  app.use(getSession());
  setupPassport(app);

  if (IS_LOCAL) {
    // Auto-login for local development
    app.get("/", (req, res, next) => {
      if (!req.user) {
        req.user = {
          id: 'local-user',
          name: 'Local User',
          picture: '',
          claims: {},
          data: { lastAuth: new Date() }
        };
      }
      next();
    });

    app.get("/auth/callback", (req, res) => {
      res.redirect("/");
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
  } else {
    app.get(
      "/",
      (req, res, next) => {
        if (req.isAuthenticated()) {
          return next();
        }
        getOidcConfig().then(({ client: oidcClient }) => {
          const url = oidcClient.authorizationUrl({
            scope: "openid profile",
            state: "state",
            redirect_uri: `${
              req.protocol + "://" + req.get("host")
            }/auth/callback`,
            response_type: "code",
          });
          res.redirect(url);
        });
      }
    );

    app.get(
      "/auth/callback",
      (req, res, next) => {
        const params = req.query;
        getOidcConfig().then(({ client: oidcClient }) => {
          passport.authenticate("repl-oidc", {
            params: oidcClient.callbackParams(params),
            successRedirect: "/",
            failureRedirect: "/auth/error",
          })(req, res, next);
        });
      }
    );

    app.get("/api/logout", (req, res) => {
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
        }
        res.redirect("/");
      });
    });
  }
}