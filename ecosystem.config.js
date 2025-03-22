module.exports = {
  apps : [{
    name   : "Hobbyconnect",
    script : "./dist/src/app.js",
    env_production : {
      NODE_ENV: "production"
    }
  }]
}
