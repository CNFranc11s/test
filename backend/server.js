const app = require('./app');

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Privacy Prism backend ready on port ${port}`);
  });
}

module.exports = app;
