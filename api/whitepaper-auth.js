const COOKIE_NAME = "katechon_whitepaper";
const COOKIE_VALUE = process.env.WHITEPAPER_ACCESS_VALUE || "whitepaper-open";
const PASSWORD = process.env.WHITEPAPER_PASSWORD || "menhir";
const ONE_WEEK = 60 * 60 * 24 * 7;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2048) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  try {
    const body = await parseBody(req);
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (password !== PASSWORD) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${COOKIE_VALUE}; Path=/; Max-Age=${ONE_WEEK}; HttpOnly; Secure; SameSite=Lax`
    );
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, href: "/whitepaper/katechon-whitepaper.pdf" }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false }));
  }
};
