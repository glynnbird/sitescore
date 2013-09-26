
var express = require('express');
var app = express();
var crawler = require("./lib/crawler.js");
var webshot = require('webshot');
var crypto = require('crypto');
var fs = require('fs');

// use the jade engine
app.engine('jade', require('jade').__express);

// use compression where appropriate
app.use(express.compress());

// server out our static directory as static files
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.render('index.jade', {"title":"Home"});
});

app.get('/go', function(req, res) {
  
//  console.log(req.query.url);
  if(typeof req.query.url != "undefined") {
    crawler.spider(req.query.url, function(d) {
  //    console.log(d);
      res.render('results.jade', {"title":"Results","results": d});
    });
  } else {
    res.render('error.jade', {"title": "Error"});
  }
    
});

app.get('/screenshot', function(req,res) {
  
  if(typeof req.query.url != "undefined" && req.query.url.length > 0) {
    var hash = crypto.createHash('md5').update(req.query.url).digest("hex");
    var tmpfile = '/tmp/'+hash+'.png';    
    
    fs.exists(tmpfile, function (exists) {
      if(exists) {
        res.sendfile(tmpfile);
      } else {
        webshot(req.query.url, tmpfile, function(err) {
          res.sendfile(tmpfile);
        });
      }
    });

  } else {
    res.send(404, 'Sorry, we cannot find that!');
  }
  
});

var port = process.env.PORT || 3000;
console.log("Listening on port",port);
app.listen(port);

