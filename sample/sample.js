var html2jquery = require('../index.js');
var fs = require('fs');

fs.readFile('source.html', 'utf8', function (err, text) {
    console.log(html2jquery(text)[0]);
});
