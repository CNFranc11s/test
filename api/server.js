const app = require('../backend/app');

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Privacy Prism server listening on port ${port}`);
  });
}

module.exports = app;
