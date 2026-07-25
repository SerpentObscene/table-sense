const fs = require('fs');
const path = require('path');
const { isAuthenticated } = require('./_auth');

let cachedHtml = null;
function getHtml() {
  if (!cachedHtml) {
    cachedHtml = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
  }
  return cachedHtml;
}

module.exports = (req, res) => {
  if (!isAuthenticated(req)) {
    res.writeHead(302, { Location: '/login.html' });
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(getHtml());
};
