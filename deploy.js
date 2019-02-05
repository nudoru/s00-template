// https://www.npmjs.com/package/ftp-deploy

var secrets = require('./secrets.json');

var FtpDeploy = require('ftp-deploy');
var ftpDeploy = new FtpDeploy();

var config = {
  user: secrets.ftpuser,
  password: secrets.ftppass,
  host: secrets.ftphost,
  port: 21,
  localRoot: __dirname + '/dist',
  remoteRoot: secrets.ftpremotedir,
  include: ['*', '**/*'],      // this would upload everything except dot files
  // include: ['*.php', 'dist/*'],
  exclude: ['**/*.map'],     // e.g. exclude sourcemaps - ** exclude: [] if nothing to exclude **
  deleteRemote: true,              // delete existing files at destination before uploading
  forcePasv: true                 // Passive mode is forced (EPSV command is not sent)
};

// use with promises
ftpDeploy.deploy(config)
  .then(res => console.log('finished:', res))
  .catch(err => console.log(err));

// use with callback
// ftpDeploy.deploy(config, function(err, res) {
//   if (err) console.log(err)
//   else console.log('finished:', res);
// });