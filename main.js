
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
        options = { screenSize: {width: 1440,height: 900},
                    userAgent: "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US)"}
        webshot(req.query.url, tmpfile, function(err) {
          res.sendfile(tmpfile);
        });
      }
    });

  } else {
    res.send(404, 'Sorry, we cannot find that!');
  }
  
});

app.get('/mscreenshot', function(req,res) {
  
  if(typeof req.query.url != "undefined" && req.query.url.length > 0) {
    var hash = crypto.createHash('md5').update("mobile"+req.query.url).digest("hex");
    var tmpfile = '/tmp/'+hash+'.png';    
    
    fs.exists(tmpfile, function (exists) {
      if(exists) {
        res.sendfile(tmpfile);
      } else {
         var options = { screenSize: {width: 320,height: 480},
                         userAgent: "Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16"
                        };
           
        webshot(req.query.url, tmpfile, options, function(err) {
          res.sendfile(tmpfile);
        });
      }
    });

  } else {
    res.send(404, 'Sorry, we cannot find that!');
  }
  
});

app.get('/tscreenshot', function(req,res) {
  
  if(typeof req.query.url != "undefined" && req.query.url.length > 0) {
    var hash = crypto.createHash('md5').update("tablet"+req.query.url).digest("hex");
    var tmpfile = '/tmp/'+hash+'.png';    
    
    fs.exists(tmpfile, function (exists) {
      if(exists) {
        res.sendfile(tmpfile);
      } else {
         var options = { screenSize: {width: 768,height: 1024},
                         userAgent: "Mozilla/5.0(iPad; U; CPU iPhone OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B314 Safari/531.21.10"
                      };
           
        webshot(req.query.url, tmpfile, options, function(err) {
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

