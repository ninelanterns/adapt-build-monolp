// console.log(process.env.npm_config_fruit);

var fs = require( 'fs' );
var path = require( 'path' );
var process = require( "process" );


console.log(process.cwd());
console.log(__dirname);

// var moveFrom = "/home/mike/dev/node/sonar/moveme";
// var moveTo = "/home/mike/dev/node/sonar/tome"

fs.readdir('.', function(error, files) {
  if (error) {
    console.error(error);
  }

  files.forEach(function(file, index) {
    // console.log(file);
  });
});
